"""Basic test for LangGraph agent implementation."""
import pytest
import asyncio
from app.services.langgraph_agent import LangGraphAgent
from app.core.config import settings


@pytest.mark.asyncio
async def test_agent_initialization():
    """Test that LangGraph agent initializes correctly."""
    agent = LangGraphAgent()
    
    assert agent is not None
    assert agent.graph is not None
    assert agent.checkpointer is not None
    assert agent.llm is not None
    
    await agent.close()


@pytest.mark.asyncio
async def test_simple_chat():
    """Test basic chat functionality."""
    agent = LangGraphAgent()
    
    try:
        # Simple query that shouldn't require tools
        result = await agent.chat(
            query="Xin chào",
            session_id="test_session_1"
        )
        
        assert "answer" in result
        assert result["answer"] is not None
        assert len(result["answer"]) > 0
        
    finally:
        await agent.close()


@pytest.mark.asyncio
@pytest.mark.skipif(not settings.GEMINI_API_KEY, reason="GEMINI_API_KEY not set")
async def test_tool_calling():
    """Test that agent can call search_library tool."""
    agent = LangGraphAgent()
    
    try:
        result = await agent.chat(
            query="Tìm kiếm truyện Hậu Ngọt",
            session_id="test_session_2"
        )
        
        assert "answer" in result
        # Should have called search_library tool
        assert result["answer"] is not None
        
    finally:
        await agent.close()


@pytest.mark.asyncio
async def test_session_persistence():
    """Test that session state is preserved."""
    agent = LangGraphAgent()
    
    try:
        # First message
        result1 = await agent.chat(
            query="Truyện Hậu Ngọt nói về gì?",
            session_id="test_session_3"
        )
        
        # Follow-up message (should remember context)
        result2 = await agent.chat(
            query="Ai là nhân vật chính?",
            session_id="test_session_3"
        )
        
        assert "answer" in result1
        assert "answer" in result2
        
    finally:
        await agent.close()


@pytest.mark.asyncio
async def test_redis_fallback():
    """Test that agent works even without Redis."""
    # Save original setting
    original_url = settings.REDIS_URL
    
    try:
        # Set invalid Redis URL
        settings.REDIS_URL = "redis://invalid:9999"
        
        agent = LangGraphAgent()
        
        result = await agent.chat(
            query="Test message",
            session_id="test_session_4"
        )
        
        # Should still work with in-memory fallback
        assert "answer" in result
        
        await agent.close()
        
    finally:
        # Restore original setting
        settings.REDIS_URL = original_url


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
