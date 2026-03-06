"""Library browsing API — direct DB queries, no LLM needed."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, distinct
from sqlalchemy.orm import aliased
from app.db.session import AsyncSessionLocal
from app.db.models import Story, Chapter
from app.core.security import get_current_user
from app.db.models import User
from typing import Optional
from loguru import logger

router = APIRouter()


@router.get("/genres")
async def list_genres(current_user: User = Depends(get_current_user)):
    """List all genres with story counts."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Story.genres).where(Story.genres.isnot(None))
        )
        rows = result.scalars().all()
    
    # Flatten genre arrays and count
    genre_count = {}
    for genre_list in rows:
        if genre_list:
            for genre in genre_list:
                genre = genre.strip()
                if genre:
                    genre_count[genre] = genre_count.get(genre, 0) + 1
    
    genres = [{"name": g, "count": c} for g, c in sorted(genre_count.items(), key=lambda x: -x[1])]
    return {"genres": genres, "total": len(genres)}


@router.get("/stories")
async def list_stories(
    genre: Optional[str] = Query(None, description="Filter by genre"),
    search: Optional[str] = Query(None, description="Search by title"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """List stories with optional genre/search filter and pagination."""
    async with AsyncSessionLocal() as session:
        # Count chapters subquery
        chapter_count_sq = (
            select(Chapter.story_id, func.count(Chapter.id).label("chapter_count"))
            .group_by(Chapter.story_id)
            .subquery()
        )
        
        query = (
            select(
                Story.id, Story.title, Story.author, Story.genres,
                Story.status, Story.url, Story.description, Story.created_at,
                func.coalesce(chapter_count_sq.c.chapter_count, 0).label("chapter_count")
            )
            .outerjoin(chapter_count_sq, Story.id == chapter_count_sq.c.story_id)
        )
        
        # Filters
        if genre:
            query = query.where(Story.genres.any(genre))
        if search:
            query = query.where(Story.title.ilike(f"%{search}%"))
        
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await session.execute(count_query)
        total = total_result.scalar() or 0
        
        # Paginate
        offset = (page - 1) * limit
        query = query.order_by(Story.created_at.desc()).offset(offset).limit(limit)
        
        result = await session.execute(query)
        rows = result.all()
    
    stories = []
    for row in rows:
        stories.append({
            "id": row.id,
            "title": row.title,
            "author": row.author,
            "genres": row.genres or [],
            "status": row.status,
            "url": row.url,
            "description": (row.description or "")[:200],
            "chapter_count": row.chapter_count,
            "created_at": str(row.created_at) if row.created_at else None
        })
    
    return {
        "stories": stories,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit if limit else 1
    }


@router.get("/stories/{story_id}")
async def get_story_detail(
    story_id: int,
    current_user: User = Depends(get_current_user)
):
    """Get detailed info about a single story."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Story).where(Story.id == story_id)
        )
        story = result.scalar_one_or_none()
        
        if not story:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Truyện không tồn tại")
        
        # Count chapters
        ch_result = await session.execute(
            select(func.count(Chapter.id)).where(Chapter.story_id == story_id)
        )
        chapter_count = ch_result.scalar() or 0
    
    return {
        "id": story.id,
        "title": story.title,
        "author": story.author,
        "genres": story.genres or [],
        "status": story.status,
        "url": story.url,
        "description": story.description,
        "chapter_count": chapter_count,
        "created_at": str(story.created_at) if story.created_at else None
    }
