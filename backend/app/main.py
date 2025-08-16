"""
Main FastAPI application for Syna backend.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import logging
import sys

from app.config import settings
from app.core.middleware import (
    RateLimitMiddleware,
    RequestLoggingMiddleware,
    ErrorHandlingMiddleware,
)
from app.core.redis_manager import redis_manager
from app.api.v1 import conversations, agents, tasks, auth, marketplace, threading
from app.api.v1.unified_websocket import unified_router
from app.api import events
from app.services.thread_summarization import run_summarization_worker

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifecycle with non-blocking startup.
    Initialize connections in background to speed up startup.
    """
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Environment: {settings.environment}")
    
    import asyncio
    
    # Non-blocking Redis connection (kick off without awaiting)
    redis_task = asyncio.create_task(initialize_redis())
    
    # Non-blocking worker startup
    summarization_task = asyncio.create_task(start_background_worker())
    
    # Store tasks for cleanup
    app.state.redis_task = redis_task
    app.state.summarization_task = summarization_task
    
    # TODO: Initialize Supabase client (non-blocking)
    # TODO: Initialize observability (non-blocking)
    
    yield
    
    # Cleanup
    logger.info("Shutting down...")
    
    # Cancel and cleanup summarization worker
    if app.state.summarization_task:
        app.state.summarization_task.cancel()
        try:
            await app.state.summarization_task
        except asyncio.CancelledError:
            logger.info("Summarization worker stopped")
        except Exception as e:
            logger.error(f"Error stopping summarization worker: {e}")
    
    # Ensure Redis is disconnected
    try:
        await redis_manager.disconnect()
        logger.info("Redis connection closed")
    except Exception as e:
        logger.error(f"Error closing Redis connection: {e}")


async def initialize_redis():
    """Initialize Redis connection in background."""
    try:
        await redis_manager.connect()
        logger.info("Redis connection established")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        # Continue without Redis if it's not critical


async def start_background_worker():
    """Start summarization worker in background."""
    try:
        await run_summarization_worker()
        logger.info("Thread summarization worker started")
    except Exception as e:
        logger.error(f"Failed to start summarization worker: {e}")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI Operating System for Conversation-Native Work",
    docs_url="/api/docs" if settings.debug else None,
    redoc_url="/api/redoc" if settings.debug else None,
    openapi_url="/api/openapi.json" if settings.debug else None,
    lifespan=lifespan,
)

# Middleware order optimized for performance and WebSocket compatibility
# 1) CORS FIRST - handles preflight requests fast, doesn't block WebSocket
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
    max_age=settings.cache_preflight_max_age if settings.is_production else 3600,  # Configurable cache
)

# Log CORS configuration for debugging
logger.info(f"CORS origins configured: {settings.cors_origins}")
logger.info(f"Environment: {settings.environment}")

# 2) Production-only middleware (security, compression)
if settings.is_production:
    # Trusted hosts for security
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*.syna.ai", "localhost"],
    )
    # TODO: Add GZipMiddleware when available
    # from fastapi.middleware.gzip import GZipMiddleware
    # app.add_middleware(GZipMiddleware, minimum_size=500)

# 3) Development-only lightweight logging
if settings.debug and settings.enable_request_logging:
    app.add_middleware(RequestLoggingMiddleware)

# 4) Rate limiting (production only, after CORS)
if settings.is_production and settings.enable_rate_limit:
    app.add_middleware(RateLimitMiddleware)

# 5) Error handling LAST (executes first on the way in)
app.add_middleware(ErrorHandlingMiddleware)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return JSONResponse(
        content={
            "status": "healthy",
            "version": settings.app_version,
            "environment": settings.environment,
        }
    )

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return JSONResponse(
        content={
            "name": settings.app_name,
            "version": settings.app_version,
            "description": "AI Operating System for Conversation-Native Work",
        }
    )

# Include API routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(conversations.router, prefix="/api/v1/conversations", tags=["Conversations"])
app.include_router(agents.router, prefix="/api/v1/agents", tags=["Agents"])
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["Tasks"])
app.include_router(marketplace.router, prefix="/api/v1/marketplace", tags=["Marketplace"])
app.include_router(threading.router, tags=["Threading"])
# Unified WebSocket endpoint only
app.include_router(unified_router, prefix="/ws", tags=["UnifiedWebSocket"])
app.include_router(events.router, prefix="/api", tags=["SSE"])

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Handle 404 errors."""
    return JSONResponse(
        status_code=404,
        content={"error": "Not found", "path": str(request.url.path)},
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """Handle 500 errors."""
    logger.error(f"Internal error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"},
    )

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.is_development,
        log_level="debug" if settings.debug else "info",
    )