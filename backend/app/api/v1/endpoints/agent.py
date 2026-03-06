import json
from fastapi import APIRouter, Depends, HTTPException
from app.schemas.agent import ChatRequest, ChatResponse
from app.services.agent_service import AgentService
from app.core.security import get_current_user
from app.db.models import User, ChatSession, ChatMessage
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

router = APIRouter()

from functools import lru_cache

@lru_cache()
def get_agent_service():
    return AgentService()

@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service),
    db: AsyncSession = Depends(get_db),
):
    try:
        session_id = request.session_id or f"user_{current_user.id}"
        
        response = await agent_service.chat(
            query=request.query,
            session_id=session_id,
            story_id=request.story_id
        )
        
        # Persist messages to DB if a real session_id was provided (UUID format)
        if request.session_id and request.session_id != "default":
            # Verify session exists and belongs to user
            result = await db.execute(
                select(ChatSession).where(
                    ChatSession.id == request.session_id,
                    ChatSession.user_id == current_user.id,
                )
            )
            session = result.scalar_one_or_none()
            
            if session:
                # Save user message
                db.add(ChatMessage(
                    session_id=session.id,
                    role="user",
                    content=request.query,
                ))
                
                # Save assistant response
                sources_data = None
                if response.sources:
                    sources_data = json.dumps(
                        [s.model_dump() for s in response.sources],
                        ensure_ascii=False
                    )
                db.add(ChatMessage(
                    session_id=session.id,
                    role="assistant",
                    content=response.answer,
                    sources_json=sources_data,
                ))
                
                # Auto-title: if session title is still default, use first user message
                if session.title == "New Chat":
                    session.title = request.query[:80] + ("..." if len(request.query) > 80 else "")
                
                await db.commit()
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
