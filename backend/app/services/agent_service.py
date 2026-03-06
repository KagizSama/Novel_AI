from google import genai
from app.core.config import settings
from app.schemas.agent import SourceNode, ChatResponse
from app.services.tools import search_library, crawl_story
from google.genai import types
from loguru import logger
import time
import json
from typing import List, Dict, Any

# Simple in-memory history cache: {session_id: [{"role": "user", "parts": "..."}, ...]}
active_sessions: Dict[str, List[dict]] = {}

class AgentService:
    def __init__(self):
        if settings.USE_LANGGRAPH:
            self._setup_langgraph()
        else:
            self._setup_gemini()
    
    def _setup_langgraph(self):
        """Setup LangGraph-based agent."""
        from app.services.langgraph_agent import LangGraphAgent
        
        logger.info("Initializing LangGraph agent")
        self.langgraph_agent = LangGraphAgent()
        self.mode = "langgraph"
        
    def _setup_gemini(self):
        """Setup legacy Gemini-based agent (fallback)."""
        if not settings.GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY not set. Agent will not function.")
            return
            
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model_name = settings.GEMINI_MODEL
        key_masked = settings.GEMINI_API_KEY[:5] + "..." + settings.GEMINI_API_KEY[-5:] if settings.GEMINI_API_KEY else "None"
        logger.info(f"Configured Gemini with Model: {self.model_name}")
        
        # Define Tools
        self.tools = [search_library, crawl_story]
        self.tool_declarations = self._build_tool_declarations()
    
    def _build_tool_declarations(self) -> List[types.Tool]:
        """
        Build tool declarations from Python functions for Gemini API.
        """
        declarations = []
        for func in self.tools:
            # Extract function signature
            func_name = func.__name__
            func_doc = func.__doc__ or f"Tool: {func_name}"
            
            # Build parameter schema based on function
            if func_name == "search_library":
                params = {
                    "type": "OBJECT",
                    "properties": {
                        "query": {
                            "type": "STRING",
                            "description": "Từ khóa tìm kiếm truyện, nhân vật, hoặc nội dung"
                        }
                    },
                    "required": ["query"]
                }
            elif func_name == "crawl_story":
                params = {
                    "type": "OBJECT",
                    "properties": {
                        "url": {
                            "type": "STRING",
                            "description": "URL của truyện cần tải"
                        }
                    },
                    "required": ["url"]
                }
            else:
                params = {"type": "OBJECT", "properties": {}}
            
            declarations.append(types.FunctionDeclaration(
                name=func_name,
                description=func_doc.strip(),
                parameters=params
            ))
        
        return [types.Tool(function_declarations=declarations)]
    
    async def chat(self, query: str, session_id: str = "default", story_id: int = None) -> ChatResponse:
        """
        Process a chat query.
        Routes to LangGraph agent if enabled, otherwise uses legacy Gemini agent.
        """
        # Route to LangGraph agent if enabled
        if settings.USE_LANGGRAPH:
            return await self._chat_langgraph(query, session_id)
        
        # Legacy Gemini agent
        return await self._chat_gemini(query, session_id, story_id)
    
    async def _chat_langgraph(self, query: str, session_id: str) -> ChatResponse:
        """Chat using LangGraph agent."""
        start_time = time.time()
        
        try:
            result = await self.langgraph_agent.chat(query, session_id)
            
            latency = time.time() - start_time
            
            return ChatResponse(
                answer=result.get("answer", "Xin lỗi, không nhận được phản hồi."),
                sources=result.get("sources", []),
                latency=latency,
                tool_name="langgraph"
            )
        except Exception as e:
            logger.error(f"LangGraph agent failed: {e}")
            latency = time.time() - start_time
            return ChatResponse(
                answer=f"Xin lỗi, hệ thống gặp lỗi: {str(e)}",
                sources=[],
                latency=latency,
                tool_name=None
            )
    
    async def _chat_gemini(self, query: str, session_id: str = "default", story_id: int = None) -> ChatResponse:
        """Legacy Gemini chat implementation."""
        start_time = time.time()
        history = self._get_history(session_id)
        rewritten_query = await self._rewrite_query(query, history)
        
        system_instruction = """Bạn là trợ lý thông minh chuyên về tiểu thuyết Trung Quốc và Việt Nam.

CÔNG CỤ CÓ SẴN:
- search_library(query): Tìm kiếm nội dung truyện trong thư viện
- crawl_story(url): Tải truyện mới vào thư viện

QUY TẮC QUAN TRỌNG:
1. LUÔN LUÔN gọi search_library khi người dùng hỏi về nội dung, nhân vật, hoặc cốt truyện
2. Khi nhận kết quả từ search_library:
   - ĐỌC CẨN THẬN TẤT CẢ các đoạn content được trả về
   - TỔNG HỢP và KẾT NỐI thông tin từ NHIỀU chunks để tạo câu trả lời mạch lạc
   - TRÍCH DẪN tên nhân vật, sự kiện, địa điểm cụ thể từ content
3. TUYỆT ĐỐI KHÔNG bịa đặt thông tin không có trong results
4. Nếu search trả về ít kết quả hoặc không đủ thông tin → nói rõ và đề xuất giải pháp

HƯỚNG DẪN TÓM TẮT:
- Khi user hỏi "tóm tắt bộ [tên truyện]":
  * Gọi search_library với tên truyện
  * Tập trung vào: bối cảnh, nhân vật chính, mục tiêu/nhiệm vụ, mối quan hệ, plot chính
  * Tóm tắt TỔNG QUAN toàn bộ câu chuyện, không chỉ 1 chapter
  * Kết hợp thông tin từ NHIỀU chapters khác nhau
  
- Khi user hỏi "tóm tắt tập 1" hoặc "tóm tắt phần đầu":
  * Gọi search_library với từ khóa bao gồm "tập 1" hoặc "chương đầu"
  * Chỉ tóm tắt các chapters ban đầu (~10 chapters đầu)
  * Tập trung vào: cách nhân vật chính xuất hiện, bối cảnh mở đầu, sự kiện khởi đầu
  
- Khi user hỏi về nhân vật hoặc sự kiện cụ thể:
  * Gọi search_library với tên nhân vật/sự kiện
  * Cung cấp thông tin CHI TIẾT từ content
  * Nêu rõ trong chapter nào thông tin này xuất hiện

ĐỊNH DẠNG TRẢ LỜI:
- Sử dụng ngôn ngữ tự nhiên, mạch lạc
- Chia đoạn rõ ràng cho dễ đọc
- Nêu tên truyện/chapter khi cần thiết
- Khi có nhiều thông tin, tổ chức theo thứ tự logic (thời gian, tầm quan trọng)

LƯU Ý:
- Nếu user follow-up mà không nêu tên truyện → sử dụng context từ lịch sử chat
- Nếu search trả về quá ít kết quả (<5) → thông báo và suggest crawl thêm data
"""
        
        # Build messages for Gemini
        messages = []
        messages.append({"role": "user", "parts": [system_instruction]})
        messages.append({"role": "model", "parts": ["Tại hạ đã rõ. Xin mời độc giả ra lệnh."]})
        messages.extend(history)
        messages.append({"role": "user", "parts": [rewritten_query]})
        
        sources = []
        final_answer = ""
        tool_name = None
        
        try:
            # Convert messages to new format
            contents = []
            for msg in messages:
                role = msg.get("role")
                parts_data = msg.get("parts", [])
                
                if role in ["user", "model"]:
                    if isinstance(parts_data, list) and len(parts_data) > 0:
                        contents.append(types.Content(
                            role=role,
                            parts=[types.Part.from_text(parts_data[0])]
                        ))
            
            # First turn: Gemini decides to call tool or answer
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=types.GenerateContentConfig(
                    tools=self.tool_declarations,
                    system_instruction=system_instruction
                )
            )
            
            # Check for function call
            if not response.candidates or not response.candidates[0].content.parts:
                final_answer = "Xin lỗi, không nhận được phản hồi từ Gemini."
            else:
                part = response.candidates[0].content.parts[0]
                
                # Check for function call
                if part.function_call:
                    fc = part.function_call
                    fn_name = fc.name
                    fn_args = {k: v for k, v in fc.args.items()}
                    tool_name = fn_name
                    
                    logger.info(f"Gemini requested tool: {fn_name} with args: {fn_args}")
                
                    # Execute Tool
                    tool_result = {}
                    if fn_name == "search_library":
                        q = fn_args.get("query")
                        if q:
                            tool_result = await search_library(q)
                            if tool_result.get("results"):
                                for res in tool_result["results"]:
                                    sources.append(SourceNode(
                                        story_title=res.get("story", "Unknown"),
                                        chapter_title=res.get("chapter", "Unknown"),
                                        content_snippet=res.get("content", "")[:100] + "...",
                                        score=0.0
                                    ))
                        else:
                            tool_result = {"error": "Missing query argument"}

                    elif fn_name == "crawl_story":
                        url = fn_args.get("url")
                        if url:
                            tool_result = await crawl_story(url)
                        else:
                            tool_result = {"error": "Missing url argument"}
                    
                    # Send Tool Result back to Gemini
                    contents.append(response.candidates[0].content)
                    
                    function_response_part = types.Part.from_function_response(
                        name=fn_name,
                        response={"result": tool_result}
                    )
                    contents.append(types.Content(
                        role="tool",
                        parts=[function_response_part]
                    ))
                    
                    # Second turn
                    response2 = self.client.models.generate_content(
                        model=self.model_name,
                        contents=contents,
                        config=types.GenerateContentConfig(
                            tools=self.tool_declarations,
                            system_instruction=system_instruction
                        )
                    )
                    
                    if not response2.candidates or not response2.candidates[0].content.parts:
                        final_answer = "Xin lỗi, không nhận được phản hồi từ hệ thống."
                    else:
                        part2 = response2.candidates[0].content.parts[0]
                        if part2.function_call:
                            logger.warning(f"Gemini attempted recursive tool call: {part2.function_call.name}")
                            final_answer = "Xin lỗi, tôi cần thêm bước xử lý nhưng hệ thống giới hạn 1 lượt gọi công cụ."
                        else:
                            final_answer = part2.text
                else:
                    # No function call
                    final_answer = part.text
                    
        except Exception as e:
            logger.error(f"Gemini interaction failed: {e}")
            final_answer = "Xin lỗi, hệ thống đang gặp lỗi kỹ thuật."
            
        # Update history
        self._update_history(session_id, "user", query)
        self._update_history(session_id, "model", final_answer)
        
        latency = time.time() - start_time
        
        return ChatResponse(
            answer=final_answer,
            sources=sources if sources else [],
            latency=latency,
            tool_name=tool_name
        )
    
    # Indicators that suggest query needs LLM rewriting (ambiguous references)
    _AMBIGUOUS_INDICATORS = [
        "nó", "bộ đó", "bộ này", "truyện đó", "truyện này",
        "tiếp", "tiếp theo", "phần sau", "phần tiếp",
        "cái đó", "cái này", "ở trên", "vừa nãy",
        "nhân vật đó", "tác giả đó", "chương tiếp",
    ]
    
    async def _rewrite_query(self, query: str, history: List[dict]) -> str:
        """Rewrite query based on history. Only calls LLM when query is ambiguous."""
        if not history:
            return query
        
        # Rule-based check: skip LLM if query is already clear
        query_lower = query.lower()
        needs_rewrite = any(
            indicator in query_lower 
            for indicator in self._AMBIGUOUS_INDICATORS
        )
        
        if not needs_rewrite:
            logger.debug(f"Query rewrite skipped (no ambiguity): '{query}'")
            return query
            
        recent_history = history[-4:]
        history_text = "\n".join([f"{msg['role']}: {msg['parts'][0]}" for msg in recent_history])
        
        prompt = f"""Bạn là một chuyên gia ngôn ngữ. 
Nhiệm vụ: Viết lại câu hỏi sau đây sao cho nó đầy đủ ý nghĩa, thay thế các đại từ.

Lịch sử:
{history_text}

Câu hỏi gốc: "{query}"

Câu hỏi viết lại:"""

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            rewritten = response.text.strip()
            logger.info(f"Original: '{query}' -> Rewritten: '{rewritten}'")
            return rewritten
        except Exception as e:
            logger.error(f"Query rewriting failed: {e}")
            return query
    
    def _get_history(self, session_id: str) -> List[dict]:
        return active_sessions.get(session_id, [])
    
    def _update_history(self, session_id: str, role: str, content: str):
        if session_id not in active_sessions:
            active_sessions[session_id] = []
        active_sessions[session_id].append({"role": role, "parts": [content]})
        if len(active_sessions[session_id]) > 20:
            active_sessions[session_id] = active_sessions[session_id][-20:]
    
    async def cleanup(self):
        """Cleanup resources."""
        if settings.USE_LANGGRAPH and hasattr(self, 'langgraph_agent'):
            await self.langgraph_agent.close()
