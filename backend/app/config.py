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
        default="postgresql://syna:syna_secure_password@localhost:5432/syna",
        description="PostgreSQL connection URL"
    )
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis/Valkey connection URL"
    )
    
    # Redis/Valkey specific settings
    redis_max_connections: int = Field(default=50, description="Max Redis connections")
    redis_socket_keepalive: bool = Field(default=True, description="Enable TCP keepalive")
    redis_socket_keepalive_options: dict = Field(
        default_factory=lambda: {
            1: 60,  # TCP_KEEPIDLE
            2: 10,  # TCP_KEEPINTVL
            3: 6,   # TCP_KEEPCNT
        },
        description="TCP keepalive options"
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
        default=[
            "https://syna.ai",
            "https://app.syna.ai", 
            "https://dashboard.syna.ai",
            "wss://syna.ai",
            "wss://app.syna.ai",
            "wss://dashboard.syna.ai"
        ],
        description="Allowed CORS origins for production (WebSocket compatible)"
    )
    
    # Development-only CORS origins (only used when environment=development)
    dev_allowed_origins: List[str] = Field(
        default=[
            "http://localhost:5173",
            "http://localhost:3000", 
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
            "ws://localhost:5173",
            "ws://localhost:3000",
            "ws://127.0.0.1:5173", 
            "ws://127.0.0.1:3000"
        ],
        description="Development-only CORS origins (includes WebSocket)"
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
    
    # Performance Toggles
    enable_gzip: bool = Field(default=True, description="Enable Gzip compression (production)")
    enable_rate_limit: bool = Field(default=True, description="Enable rate limiting (production)")
    enable_request_logging: bool = Field(default=True, description="Enable request logging (development)")
    cache_preflight_max_age: int = Field(default=86400, description="CORS preflight cache duration (seconds)")
    
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
    
    @property
    def cors_origins(self) -> List[str]:
        """Get appropriate CORS origins based on environment."""
        if self.is_development:
            return self.dev_allowed_origins
        return self.allowed_origins


# Create a singleton instance
settings = Settings()