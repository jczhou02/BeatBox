# /backend/app/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_BUCKET: str = "stems"
    SIGNED_URL_EXPIRES_IN: int = 3600 # 1 hour

    class Config:
        env_file = ".env"  # Loads variables from /backend/.env
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings():
    return Settings()
