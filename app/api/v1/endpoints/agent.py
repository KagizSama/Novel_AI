from fastapi import APIRouter, Depends, HTTPException
from app.schemas.agent import ChatRequest, ChatResponse
from app.services.agent_service import AgentService
from app.core.security import get_current_user
from app.db.models import User

router = APIRouter()

from functools import lru_cache

@lru_cache()
def get_agent_service():
    return AgentService()

@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
):
    try:
        response = await agent_service.chat(
            query=request.query,
            session_id=request.session_id or f"user_{current_user.id}",
            story_id=request.story_id
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
