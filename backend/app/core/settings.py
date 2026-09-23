from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Port Pass Management"
    secret_key: str = "e8f3b2a9c14d7e6f0a5b8c9d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f"
    access_token_expire_minutes: int = 480
    database_url: str = "postgresql+psycopg2://postgres:admin123@127.0.0.1:5432/port_pass_db"
    cors_origins: str = "*"

    # ── HA / DR Settings ──────────────────────────────────────────────
    server_role: str = "primary"  # "primary" or "standby"
    standby_host: Optional[str] = None
    primary_host: Optional[str] = None

    # Backup settings
    backup_dir: str = "backups"  # default local path; override for NAS/remote
    backup_retention_daily: int = 14
    backup_retention_weekly: int = 8
    backup_retention_monthly: int = 6
    backup_db_host: str = "127.0.0.1"
    backup_db_port: int = 5432
    backup_db_name: str = "port_pass_db"
    backup_db_user: str = "postgres"
    backup_db_password: str = "admin123"

    # Health monitoring
    disk_warning_threshold: int = 80  # percentage
    disk_critical_threshold: int = 90  # percentage
    replication_lag_warning: int = 30  # seconds
    replication_lag_critical: int = 120  # seconds

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
