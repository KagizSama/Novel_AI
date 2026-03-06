import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import crawler, search, agent, auth, library, chat_history
from app.core.config import settings

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    if not os.path.exists(settings.DATA_DIR):
        os.makedirs(settings.DATA_DIR)
    yield

app = FastAPI(title="TruyenFull Crawler", lifespan=lifespan)

# CORS for React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(library.router, prefix="/api/v1/library", tags=["library"])
app.include_router(chat_history.router, prefix="/api/v1/chat", tags=["chat"])
app.include_router(crawler.router, prefix="/api/v1", tags=["crawler"])
app.include_router(search.router, prefix="/api/v1", tags=["search"])
app.include_router(agent.router, prefix="/api/v1/agent", tags=["agent"])

@app.get("/")
async def health_check():
    return {"status": "ok", "service": "TruyenFull Crawler API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
