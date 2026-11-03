from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="RGGU_", env_file=".env", extra="ignore")
    cache_ttl: int = Field(default=900, ge=1)
    refresh_cooldown: int = Field(default=60, ge=1)
    allow_manual_refresh: bool = False
    max_stale_seconds: int = Field(default=604800, ge=1)
    upstream_timeout: float = Field(default=20, gt=0)
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]


settings = Settings()
