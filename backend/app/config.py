from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./siger.db"
    jwt_secret: str = "dev-only-change-me"
    jwt_expires_minutes: int = 480
    environment: str = "development"
    frontend_origin: str = "http://localhost:8081,http://localhost:3000"
    port: int = 4000
    timezone: str = "America/El_Salvador"
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None
    smtp_tls: bool = True
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.frontend_origin.split(",") if item.strip()]


settings = Settings()
