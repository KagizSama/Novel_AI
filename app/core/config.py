from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

class Settings(BaseSettings):
    BASE_URL: str = "https://truyenfull.vision"
    DATA_DIR: Path = Path("data")
    CONCURRENT_REQUESTS: int = 5
    BATCH_SIZE: int = 30
    CHAPTER_DELAY: float = 0.3
    REQUEST_TIMEOUT: int = 30
    RETRIES: int = 3
    RETRY_BACKOFF: float = 1.5
    DATABASE_URL: str = ""
    SAVE_TO_JSON: bool = False
    ELASTICSEARCH_URL: str = "http://localhost:9200"
    ELASTICSEARCH_USER: str = ""
    ELASTICSEARCH_PASSWORD: str = ""
    ELASTICSEARCH_INDEX: str = "stories"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = ""
    
    # Redis Configuration for LangGraph
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_TTL: int = 86400  # 24 hours
    
    # Agent Configuration
    USE_LANGGRAPH: bool = True
    ENABLE_AGENT_STREAMING: bool = True
    ENABLE_REFLECTION: bool = True
    MAX_CONTEXT_TOKENS: int = 100000
    MAX_RECURSION_LIMIT: int = 50

    # JWT Authentication
    JWT_SECRET_KEY: str = "change-me-to-a-random-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="APP_",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()