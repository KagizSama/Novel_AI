from app.services.search_service import SearchService
from app.services.crawler import CrawlerService
from app.schemas.story import StoryData
import asyncio
from typing import List, Dict, Any
from loguru import logger

# Wrapper class to hold service instances if needed, 
# but for Gemini tools, simple functions are often easier.
# However, we need access to the async services.

async def search_library(query: str) -> Dict[str, Any]:
    """
    Search for novels, characters, or plot details in the library.
    Enhanced with intent classification and deeper retrieval.
    
    Args:
        query: The search query (e.g., "truyện tiên hiệp hay", "nhân vật Ngu Dung Ca", "tóm tắt bộ X").
    
    Returns:
        JSON containing list of relevant story chunks with metadata.
    """
    service = SearchService()
    try:
        # Intent classification and query analysis
        query_lower = query.lower()
        
        # Detect summarization intent
        is_summary = any(keyword in query_lower for keyword in [
            "tóm tắt", "tóm lược", "kể", "nội dung", "cốt truyện", "câu chuyện"
        ])
        
        # Detect specific chapter/volume request
        is_volume_specific = any(keyword in query_lower for keyword in [
            "tập 1", "tập 2", "tập đầu", "tập cuối",
            "chương 1", "chương đầu", "phần đầu", "phần 1"
        ])
        
        # Adjust retrieval depth based on intent
        if is_summary:
            # For summaries, retrieve more chunks to get comprehensive context
            limit = 50
        else:
            # For specific searches, 30 is sufficient
            limit = 30
            
        # Perform hybrid search
        hits = await service.hybrid_search(query, limit=limit)
        
        # Process results with enhanced metadata
        results = []
        seen_chapters = set()  # Deduplicate by chapter to avoid redundancy
        
        for hit in hits:
            source = hit['_source']
            chapter_key = f"{source.get('story_title')}_{source.get('chapter_title')}"
            
            # For summaries, we want diverse chapters, not multiple chunks from same chapter
            if is_summary and chapter_key in seen_chapters:
                continue
                
            results.append({
                "story": source.get('story_title'),
                "chapter": source.get('chapter_title'),
                "content": source.get('content'),
                "score": hit.get('_score', 0)
            })
            
            if is_summary:
                seen_chapters.add(chapter_key)
        
        # Add metadata to help LLM understand the context
        metadata = {
            "query_type": "summary" if is_summary else "search",
            "is_volume_specific": is_volume_specific,
            "total_results": len(results)
        }
        
        return {
            "results": results,
            "metadata": metadata
        }
    except Exception as e:
        logger.error(f"Search library failed: {e}")
        return {"error": str(e)}
    finally:
        await service.close()

async def crawl_story(url: str) -> Dict[str, str]:
    """
    Download/Crawl a new story from a URL (truyenfull.vn, etc.) into the library.
    Use this when the user explicitly asks to add or download a story.
    
    Args:
        url: The full URL of the story to crawl.
        
    Returns:
        Status message indicating the crawl has started.
    """
    crawler = CrawlerService()
    
    try:
        # Just fetch metadata to verify valid link
        metadata = await crawler.get_metadata(url)
        
        # Wait for the crawl to finish (Synchronous Tool Execution)
        # This ensures the UI remains in "Processing" state until done.
        # Note: If crawl is very long, this might timeout, but for typical use it's better UX as per request.
        story_data = await crawler.crawl_story(url)
        
        # Save to Database
        story_id = await crawler.save_story_to_db(story_data)
        
        # Auto-index to Elasticsearch
        try:
            search_service = SearchService()
            try:
                await search_service.vectorize_and_index_story(story_id)
                index_status = " và đã được lập chỉ mục để tìm kiếm"
            finally:
                await search_service.close()
        except Exception as e:
            logger.error(f"Auto-indexing failed for story {story_id}: {e}")
            index_status = " nhưng việc lập chỉ mục gặp lỗi"
        
        return {
            "status": "success",
            "message": f"Đã cào thành công truyện '{metadata.title}' vào thư viện{index_status}!",
            "story_title": metadata.title
        }
    except Exception as e:
        return {"error": f"Lỗi khi cào truyện: {str(e)}"}
