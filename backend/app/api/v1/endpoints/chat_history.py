import json
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List

from app.db.session import get_db
from app.db.models import ChatSession, ChatMessage, User
from app.core.security import get_current_user

router = APIRouter()


# --- Schemas ---

class SessionOut(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int = 0
    last_message: Optional[str] = None

class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    sources: Optional[list] = None
    created_at: str

class CreateSessionRequest(BaseModel):
    title: Optional[str] = "New Chat"

class RenameSessionRequest(BaseModel):
    title: str


# --- Endpoints ---

@router.get("/sessions", response_model=List[SessionOut])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all chat sessions for the current user, newest first."""
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
    )
    sessions = result.scalars().all()
    
    out = []
    for s in sessions:
        # Count messages
        msg_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == s.id)
            .order_by(ChatMessage.created_at.desc())
        )
        msgs = msg_result.scalars().all()
        last_msg = msgs[0].content[:100] if msgs else None
        
        out.append(SessionOut(
            id=s.id,
            title=s.title or "New Chat",
            created_at=s.created_at.isoformat(),
            updated_at=s.updated_at.isoformat() if s.updated_at else s.created_at.isoformat(),
            message_count=len(msgs),
            last_message=last_msg,
        ))
    return out


@router.post("/sessions", response_model=SessionOut)
async def create_session(
    body: CreateSessionRequest = CreateSessionRequest(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new chat session."""
    session = ChatSession(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        title=body.title or "New Chat",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    return SessionOut(
        id=session.id,
        title=session.title,
        created_at=session.created_at.isoformat(),
        updated_at=session.created_at.isoformat(),
        message_count=0,
        last_message=None,
    )


@router.get("/sessions/{session_id}/messages", response_model=List[MessageOut])
async def get_session_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all messages for a session."""
    # Verify ownership
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    msg_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = msg_result.scalars().all()
    
    return [
        MessageOut(
            id=m.id,
            role=m.role,
            content=m.content,
            sources=json.loads(m.sources_json) if m.sources_json else None,
            created_at=m.created_at.isoformat(),
        )
        for m in messages
    ]


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a chat session and all its messages."""
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    await db.delete(session)
    await db.commit()
    return {"detail": "Session deleted"}


@router.patch("/sessions/{session_id}", response_model=SessionOut)
async def rename_session(
    session_id: str,
    body: RenameSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rename a chat session."""
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.title = body.title
    await db.commit()
    await db.refresh(session)
    
    msg_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
    )
    msg_count = len(msg_result.scalars().all())
    
    return SessionOut(
        id=session.id,
        title=session.title,
        created_at=session.created_at.isoformat(),
        updated_at=session.updated_at.isoformat() if session.updated_at else session.created_at.isoformat(),
        message_count=msg_count,
        last_message=None,
    )
