"""Authentication endpoints: register, login, Google OAuth, profile."""
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models import User
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, get_current_user
)
from app.core.config import settings
from loguru import logger

router = APIRouter()


# === Schemas ===

class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    username: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleAuthRequest(BaseModel):
    id_token: str  # Google OAuth id_token from frontend


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    role: str
    avatar_url: str | None
    is_active: bool


def _user_to_dict(user: User) -> dict:
    """Convert User model to dict for response."""
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "role": user.role,
        "avatar_url": user.avatar_url,
        "is_active": user.is_active
    }


# === Endpoints ===

@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest):
    """Register a new user with email + password."""
    async with AsyncSessionLocal() as session:
        # Check if email already exists
        result = await session.execute(
            select(User).where(User.email == request.email)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email đã được đăng ký"
            )
        
        # Create user
        user = User(
            email=request.email,
            username=request.username,
            hashed_password=hash_password(request.password),
            role="user",
            is_active=True
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        
        logger.info(f"New user registered: {user.email}")
        
        # Generate tokens
        token_data = {"sub": str(user.id)}
        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
            user=_user_to_dict(user)
        )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Login with email + password."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == request.email)
        )
        user = result.scalar_one_or_none()
        
        if not user or not user.hashed_password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email hoặc mật khẩu không đúng"
            )
        
        if not verify_password(request.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email hoặc mật khẩu không đúng"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản đã bị vô hiệu hóa"
            )
        
        logger.info(f"User logged in: {user.email}")
        
        token_data = {"sub": str(user.id)}
        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
            user=_user_to_dict(user)
        )


@router.post("/google", response_model=TokenResponse)
async def google_auth(request: GoogleAuthRequest):
    """Authenticate with Google OAuth id_token."""
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests
    
    try:
        # Verify the Google id_token
        idinfo = google_id_token.verify_oauth2_token(
            request.id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
        
        google_id = idinfo["sub"]
        email = idinfo.get("email", "")
        name = idinfo.get("name", email.split("@")[0])
        picture = idinfo.get("picture", None)
        
    except ValueError as e:
        logger.error(f"Google token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google token không hợp lệ"
        )
    
    async with AsyncSessionLocal() as session:
        # Check if user exists by google_id
        result = await session.execute(
            select(User).where(User.google_id == google_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            # Check if email exists (link accounts)
            result = await session.execute(
                select(User).where(User.email == email)
            )
            user = result.scalar_one_or_none()
            
            if user:
                # Link Google account to existing user
                user.google_id = google_id
                if picture:
                    user.avatar_url = picture
                await session.commit()
                await session.refresh(user)
                logger.info(f"Linked Google account to existing user: {email}")
            else:
                # Create new user
                user = User(
                    email=email,
                    username=name,
                    google_id=google_id,
                    avatar_url=picture,
                    role="user",
                    is_active=True
                )
                session.add(user)
                await session.commit()
                await session.refresh(user)
                logger.info(f"New Google user created: {email}")
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản đã bị vô hiệu hóa"
            )
        
        token_data = {"sub": str(user.id)}
        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
            user=_user_to_dict(user)
        )


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        role=current_user.role,
        avatar_url=current_user.avatar_url,
        is_active=current_user.is_active
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshRequest):
    """Refresh access token using refresh token."""
    payload = decode_token(request.refresh_token)
    
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không đúng loại"
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ"
        )
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.id == int(user_id))
        )
        user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản không tồn tại hoặc đã bị vô hiệu hóa"
        )
    
    token_data = {"sub": str(user.id)}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=_user_to_dict(user)
    )
