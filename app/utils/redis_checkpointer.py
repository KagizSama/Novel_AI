"""Redis-based checkpointer for LangGraph persistent memory."""
import json
from typing import Optional, Dict, Any, List
from redis import asyncio as aioredis
from loguru import logger
from app.core.config import settings
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage


def serialize_messages(messages: List) -> List[Dict]:
    """Convert LangChain messages to JSON-serializable format."""
    serialized = []
    for msg in messages:
        if isinstance(msg, HumanMessage):
            serialized.append({"type": "human", "content": msg.content})
        elif isinstance(msg, AIMessage):
            serialized.append({
                "type": "ai", 
                "content": msg.content,
                "tool_calls": [
                    {
                        "name": tc.get("name"),
                        "args": tc.get("args"),
                        "id": tc.get("id")
                    } for tc in (msg.tool_calls or [])
                ]
            })
        elif isinstance(msg, SystemMessage):
            serialized.append({"type": "system", "content": msg.content})
        elif isinstance(msg, ToolMessage):
            serialized.append({
                "type": "tool",
                "content": msg.content,
                "tool_call_id": msg.tool_call_id
            })
        else:
            # Fallback for unknown message types
            serialized.append({"type": "unknown", "content": str(msg)})
    return serialized


def deserialize_messages(serialized: List[Dict]) -> List:
    """Convert JSON format back to LangChain messages."""
    messages = []
    for msg_dict in serialized:
        msg_type = msg_dict.get("type")
        if msg_type == "human":
            messages.append(HumanMessage(content=msg_dict["content"]))
        elif msg_type == "ai":
            messages.append(AIMessage(
                content=msg_dict["content"],
                tool_calls=msg_dict.get("tool_calls", [])
            ))
        elif msg_type == "system":
            messages.append(SystemMessage(content=msg_dict["content"]))
        elif msg_type == "tool":
            messages.append(ToolMessage(
                content=msg_dict["content"],
                tool_call_id=msg_dict.get("tool_call_id", "")
            ))
    return messages


class RedisCheckpointer:
    """
    Redis-based checkpointer for storing LangGraph conversation state.
    Provides persistent memory across server restarts.
    """
    
    def __init__(self, redis_url: str = None, ttl: int = None):
        self.redis_url = redis_url or settings.REDIS_URL
        self.ttl = ttl or settings.REDIS_TTL
        self.redis: Optional[aioredis.Redis] = None
        self._fallback_memory: Dict[str, Any] = {}
        
    async def connect(self):
        """Connect to Redis, fallback to in-memory if unavailable."""
        try:
            self.redis = await aioredis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis.ping()
            logger.info(f"Redis checkpointer connected to {self.redis_url}")
        except Exception as e:
            logger.warning(f"Redis unavailable, using in-memory fallback: {e}")
            self.redis = None
    
    async def get(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve state for a session."""
        key = f"langgraph:session:{session_id}"
        
        if self.redis:
            try:
                data = await self.redis.get(key)
                if data:
                    state = json.loads(data)
                    # Deserialize messages back to LangChain format
                    if "messages" in state:
                        state["messages"] = deserialize_messages(state["messages"])
                    return state
            except Exception as e:
                logger.error(f"Redis get failed: {e}, using fallback")
        
        # Fallback to in-memory
        return self._fallback_memory.get(session_id)
    
    async def put(self, session_id: str, state: Dict[str, Any]):
        """Store state for a session."""
        key = f"langgraph:session:{session_id}"
        
        if self.redis:
            try:
                # Serialize messages to JSON-compatible format
                serializable_state = state.copy()
                if "messages" in serializable_state:
                    serializable_state["messages"] = serialize_messages(serializable_state["messages"])
                
                await self.redis.setex(
                    key,
                    self.ttl,
                    json.dumps(serializable_state)
                )
                return
            except Exception as e:
                logger.error(f"Redis put failed: {e}, using fallback")
        
        # Fallback to in-memory
        self._fallback_memory[session_id] = state
    
    async def delete(self, session_id: str):
        """Delete state for a session."""
        key = f"langgraph:session:{session_id}"
        
        if self.redis:
            try:
                await self.redis.delete(key)
            except Exception as e:
                logger.error(f"Redis delete failed: {e}")
        
        # Also clear from fallback
        self._fallback_memory.pop(session_id, None)
    
    async def close(self):
        """Close Redis connection."""
        if self.redis:
            await self.redis.close()
