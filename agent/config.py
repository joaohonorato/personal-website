from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).parent / ".env",
        extra="ignore",
    )

    anthropic_api_key: str
    tavily_api_key: str
    blog_api_url: str = "http://localhost:8080"
    auth_server_url: str = ""
    auth_client_id: str = "blog-agent"
    auth_client_secret: str = ""

    openai_api_key: str = ""
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""

    allowed_roles: frozenset[str] = frozenset({"ADMIN", "AI_USER"})

    @model_validator(mode="after")
    def _check_required(self) -> "Settings":
        if not self.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY is required")
        if not self.tavily_api_key:
            raise ValueError("TAVILY_API_KEY is required")
        return self

    @property
    def cover_image_enabled(self) -> bool:
        return bool(self.openai_api_key and self.cloudinary_cloud_name)


settings = Settings()
