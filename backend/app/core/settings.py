from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Port Pass Management"
    secret_key: str = "e8f3b2a9c14d7e6f0a5b8c9d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f"
    access_token_expire_minutes: int = 480
    database_url: str = "postgresql+psycopg2://postgres:admin123@127.0.0.1:5432/port_pass_db"
    cors_origins: str = "*"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
