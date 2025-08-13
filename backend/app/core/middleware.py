"""
Custom middleware for the Syna backend.
"""

import time
import uuid
import logging
from typing import Callable
from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """
    Global error handling middleware.
    Catches all exceptions and returns appropriate JSON responses.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            response = await call_next(request)
            return response
        except HTTPException as exc:
            # Let HTTPException pass through
            raise exc
        except Exception as exc:
            # Log the error
            logger.error(f"Unhandled exception: {exc}", exc_info=True)
            
            # Return JSON error response
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal server error",
                    "message": str(exc) if request.app.state.settings.debug else "An error occurred",
                    "request_id": getattr(request.state, "request_id", None),
                },
            )


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Logs all incoming requests and their response times.
    Adds a unique request ID to each request.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Start timer
        start_time = time.time()
        
        # Log request
        logger.info(
            f"Request started: {request.method} {request.url.path} "
            f"[{request_id}]"
        )
        
        # Process request
        response = await call_next(request)
        
        # Calculate duration
        duration = time.time() - start_time
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{duration:.3f}"
        
        # Log response
        logger.info(
            f"Request completed: {request.method} {request.url.path} "
            f"[{request_id}] - Status: {response.status_code} - "
            f"Duration: {duration:.3f}s"
        )
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple rate limiting middleware.
    Limits requests per IP address within a time window.
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.requests = defaultdict(list)
        self.max_requests = 100  # Will be overridden by settings
        self.window_seconds = 60  # Will be overridden by settings
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/", "/api/docs", "/api/openapi.json"]:
            return await call_next(request)
        
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        
        # Get rate limit settings from app config
        settings = getattr(request.app.state, "settings", None)
        if settings:
            self.max_requests = settings.rate_limit_requests
            self.window_seconds = settings.rate_limit_window
        
        # Current time
        now = datetime.now()
        
        # Clean old requests
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip]
            if now - req_time < timedelta(seconds=self.window_seconds)
        ]
        
        # Check rate limit
        if len(self.requests[client_ip]) >= self.max_requests:
            logger.warning(f"Rate limit exceeded for {client_ip}")
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "message": f"Maximum {self.max_requests} requests per {self.window_seconds} seconds",
                },
                headers={
                    "Retry-After": str(self.window_seconds),
                    "X-RateLimit-Limit": str(self.max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + self.window_seconds),
                },
            )
        
        # Record request
        self.requests[client_ip].append(now)
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        remaining = self.max_requests - len(self.requests[client_ip])
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + self.window_seconds)
        
        return response


class AuthenticationMiddleware(BaseHTTPMiddleware):
    """
    Authentication middleware.
    Validates JWT tokens for protected endpoints.
    """
    
    EXEMPT_PATHS = [
        "/",
        "/health",
        "/api/docs",
        "/api/openapi.json",
        "/api/v1/auth/login",
        "/api/v1/auth/register",
    ]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip auth for exempt paths
        if request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)
        
        # Check for Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"error": "Unauthorized", "message": "Missing or invalid token"},
            )
        
        # TODO: Validate JWT token
        # For now, just pass through
        
        return await call_next(request)