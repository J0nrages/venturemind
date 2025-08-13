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
from app.api.v1.websocket import websocket_router
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
    Manage application lifecycle.
    Initialize connections and cleanup on shutdown.
    """
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Environment: {settings.environment}")
    
    # Initialize connections
    try:
        # Initialize Redis
        await redis_manager.connect()
        logger.info("Redis connection established")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        # Continue without Redis if it's not critical
    
    # Start background workers
    import asyncio
    summarization_task = None
    try:
        summarization_task = asyncio.create_task(run_summarization_worker())
        logger.info("Thread summarization worker started")
    except Exception as e:
        logger.error(f"Failed to start summarization worker: {e}")
    
    # TODO: Initialize Supabase client
    # TODO: Initialize observability
    
    yield
    
    # Stop background workers
    if summarization_task:
        summarization_task.cancel()
        try:
            await summarization_task
        except asyncio.CancelledError:
            logger.info("Summarization worker stopped")
        except Exception as e:
            logger.error(f"Error stopping summarization worker: {e}")
    
    # Cleanup
    logger.info("Shutting down...")
    
    try:
        await redis_manager.disconnect()
        logger.info("Redis connection closed")
    except Exception as e:
        logger.error(f"Error closing Redis connection: {e}")


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

# Add middleware
app.add_middleware(ErrorHandlingMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

# Trusted host middleware (security)
if settings.is_production:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*.syna.ai", "localhost"],
    )

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
app.include_router(websocket_router, prefix="/ws", tags=["WebSocket"])
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