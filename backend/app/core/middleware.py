"""
Custom middleware for the Syna backend.
ASGI-native middleware for WebSocket compatibility and SYNA's real-time architecture.
"""

import time
import uuid
import logging
import json
from typing import Callable
from collections import defaultdict
from datetime import datetime, timedelta

# Removed unused imports - converted to pure ASGI middleware
from starlette.types import ASGIApp, Scope, Receive, Send
from starlette.responses import JSONResponse as StarletteJSONResponse

logger = logging.getLogger(__name__)


class ErrorHandlingMiddleware:
    """
    Pure ASGI error handling middleware for SYNA.
    Handles both HTTP and WebSocket connections properly.
    Critical for SYNA's real-time architecture reliability.
    """
    
    def __init__(self, app: ASGIApp):
        self.app = app
    
    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] == "http":
            await self._handle_http(scope, receive, send)
        elif scope["type"] == "websocket":
            await self._handle_websocket(scope, receive, send)
        else:
            await self.app(scope, receive, send)
    
    async def _handle_http(self, scope: Scope, receive: Receive, send: Send):
        """Handle HTTP requests with error catching."""
        try:
            await self.app(scope, receive, send)
        except Exception as exc:
            logger.error(f"Unhandled HTTP exception: {exc}", exc_info=True)
            
            # Create error response
            response = StarletteJSONResponse(
                status_code=500,
                content={
                    "error": "Internal server error",
                    "message": str(exc),
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )
            await response(scope, receive, send)
    
    async def _handle_websocket(self, scope: Scope, receive: Receive, send: Send):
        """Handle WebSocket connections with error catching."""
        try:
            await self.app(scope, receive, send)
        except Exception as exc:
            logger.error(f"Unhandled WebSocket exception: {exc}", exc_info=True)
            
            # Try to send error message over WebSocket if still connected
            try:
                await send({
                    "type": "websocket.send",
                    "text": json.dumps({
                        "type": "error",
                        "error": "Internal server error",
                        "message": str(exc),
                        "timestamp": datetime.utcnow().isoformat(),
                    })
                })
            except:
                # If we can't send the error, just close the connection
                await send({"type": "websocket.close", "code": 1011})


class RequestLoggingMiddleware:
    """
    Pure ASGI request logging middleware for SYNA.
    Logs both HTTP requests and WebSocket connections for complete observability.
    Critical for SYNA's "Complete Observability" pillar.
    """
    
    def __init__(self, app: ASGIApp):
        self.app = app
    
    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] == "http":
            await self._handle_http(scope, receive, send)
        elif scope["type"] == "websocket":
            await self._handle_websocket(scope, receive, send)
        else:
            await self.app(scope, receive, send)
    
    async def _handle_http(self, scope: Scope, receive: Receive, send: Send):
        """Handle HTTP request logging."""
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        method = scope["method"]
        path = scope["path"]
        
        logger.info(f"Request started: {method} {path} [{request_id}]")
        
        # Wrap send to capture response details
        async def wrapped_send(message):
            if message["type"] == "http.response.start":
                # Add custom headers
                headers = list(message.get("headers", []))
                headers.extend([
                    (b"x-request-id", request_id.encode()),
                    (b"x-response-time", f"{time.time() - start_time:.3f}".encode()),
                ])
                message["headers"] = headers
                
                # Log response
                status_code = message["status"]
                duration = time.time() - start_time
                logger.info(
                    f"Request completed: {method} {path} [{request_id}] - "
                    f"Status: {status_code} - Duration: {duration:.3f}s"
                )
            
            await send(message)
        
        await self.app(scope, receive, wrapped_send)
    
    async def _handle_websocket(self, scope: Scope, receive: Receive, send: Send):
        """Handle WebSocket connection logging."""
        connection_id = str(uuid.uuid4())
        path = scope["path"]
        query_string = scope.get("query_string", b"").decode()
        
        logger.info(f"WebSocket connection started: {path}?{query_string} [{connection_id}]")
        start_time = time.time()
        
        # Wrap send to capture connection events
        async def wrapped_send(message):
            if message["type"] == "websocket.close":
                duration = time.time() - start_time
                code = message.get("code", 1000)
                logger.info(
                    f"WebSocket connection closed: {path} [{connection_id}] - "
                    f"Code: {code} - Duration: {duration:.3f}s"
                )
            await send(message)
        
        await self.app(scope, receive, wrapped_send)


class RateLimitMiddleware:
    """
    Pure ASGI rate limiting middleware for SYNA.
    Handles both HTTP and WebSocket connections.
    Note: For SYNA's agent approval gates, consider using FastAPI dependencies instead.
    """
    
    def __init__(self, app: ASGIApp):
        self.app = app
        self.requests = defaultdict(list)
        self.max_requests = 100  # Will be overridden by settings
        self.window_seconds = 60  # Will be overridden by settings
    
    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] == "http":
            await self._handle_http(scope, receive, send)
        elif scope["type"] == "websocket":
            # WebSocket connections are typically long-lived, different rate limiting strategy
            # For now, let them through, but we could implement connection-based limits
            await self.app(scope, receive, send)
        else:
            await self.app(scope, receive, send)
    
    async def _handle_http(self, scope: Scope, receive: Receive, send: Send):
        """Handle HTTP rate limiting."""
        path = scope["path"]
        
        # Skip rate limiting for health checks and docs
        if path in ["/health", "/", "/api/docs", "/api/openapi.json"]:
            await self.app(scope, receive, send)
            return
        
        # Get client IP from scope
        client_ip = "unknown"
        if "client" in scope and scope["client"]:
            client_ip = scope["client"][0]
        
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
            
            response = StarletteJSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "message": f"Maximum {self.max_requests} requests per {self.window_seconds} seconds",
                },
                headers={
                    "retry-after": str(self.window_seconds),
                    "x-ratelimit-limit": str(self.max_requests),
                    "x-ratelimit-remaining": "0",
                    "x-ratelimit-reset": str(int(time.time()) + self.window_seconds),
                },
            )
            await response(scope, receive, send)
            return
        
        # Record request
        self.requests[client_ip].append(now)
        
        # Wrap send to add rate limit headers
        async def wrapped_send(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                remaining = self.max_requests - len(self.requests[client_ip])
                headers.extend([
                    (b"x-ratelimit-limit", str(self.max_requests).encode()),
                    (b"x-ratelimit-remaining", str(remaining).encode()),
                    (b"x-ratelimit-reset", str(int(time.time()) + self.window_seconds).encode()),
                ])
                message["headers"] = headers
            await send(message)
        
        await self.app(scope, receive, wrapped_send)


# NOTE: AuthenticationMiddleware converted to FastAPI dependencies
# This aligns with SYNA's agent approval gates architecture
# See app/core/auth.py for the dependency-based implementation