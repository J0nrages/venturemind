"""
Configuration settings for Syna backend.
Uses pydantic-settings for environment variable management.
"""

from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, validator
import json


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
    
    # Application
    app_name: str = "Syna Backend"
    app_version: str = "0.1.0"
    environment: str = Field(default="development", description="Environment (development, staging, production)")
    debug: bool = Field(default=False, description="Debug mode")
    
    # API Keys
    gemini_api_key: Optional[str] = Field(default=None, description="Google Gemini API key")
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI API key")
    anthropic_api_key: Optional[str] = Field(default=None, description="Anthropic API key")
    
    # Supabase
    supabase_url: str = Field(..., description="Supabase project URL")
    supabase_anon_key: str = Field(..., description="Supabase anonymous key")
    supabase_service_key: Optional[str] = Field(default=None, description="Supabase service key")
    
    # Database
    database_url: str = Field(
        default="postgresql://user:pass@localhost/syna",
        description="PostgreSQL connection URL"
    )
    redis_url: str = Field(
        default="redis://localhost:6379",
        description="Redis connection URL"
    )
    
    # Security
    jwt_secret: str = Field(
        default="change-this-in-production",
        description="JWT secret key"
    )
    jwt_algorithm: str = Field(default="HS256", description="JWT algorithm")
    jwt_expiration_minutes: int = Field(default=1440, description="JWT expiration in minutes")
    
    # CORS
    allowed_origins: List[str] = Field(
        default=["http://localhost:5173", "http://localhost:3000"],
        description="Allowed CORS origins"
    )
    
    @validator("allowed_origins", pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            # Try to parse as JSON first
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                # Otherwise split by comma
                return [origin.strip() for origin in v.split(",")]
        return v
    
    # Rate Limiting
    rate_limit_requests: int = Field(default=100, description="Rate limit requests")
    rate_limit_window: int = Field(default=60, description="Rate limit window in seconds")
    
    # Observability
    sentry_dsn: Optional[str] = Field(default=None, description="Sentry DSN")
    otel_endpoint: Optional[str] = Field(
        default=None,
        alias="otel_exporter_otlp_endpoint",
        description="OpenTelemetry endpoint"
    )
    
    # Feature Flags
    enable_agents: bool = Field(default=True, description="Enable agent system")
    enable_approvals: bool = Field(default=True, description="Enable approval workflows")
    enable_integrations: bool = Field(default=False, description="Enable external integrations")
    
    # Agent Configuration
    agent_default_timeout: int = Field(default=30, description="Default agent timeout in seconds")
    agent_max_retries: int = Field(default=3, description="Maximum agent retries")
    agent_default_model: str = Field(default="gpt-4", description="Default LLM model")
    
    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.environment == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development."""
        return self.environment == "development"


# Create a singleton instance
settings = Settings()