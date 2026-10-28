from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./siger.db"
    jwt_secret: str = "dev-only-change-me"
    jwt_expires_minutes: int = 480
    frontend_origin: str = "http://localhost:8081,http://localhost:3000"
    port: int = 4000
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.frontend_origin.split(",") if item.strip()]


settings = Settings()
