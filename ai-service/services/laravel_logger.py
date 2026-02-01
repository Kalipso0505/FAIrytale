"""
Fire-and-forget logger that sends logs to Laravel's game log channel.
Uses asyncio to send logs without blocking the main thread.
"""

import asyncio
import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# Laravel endpoint for receiving logs
LARAVEL_LOG_URL = os.getenv("LARAVEL_URL", "http://nginx:80") + "/api/internal/log"

# Timeout for fire-and-forget requests (very short)
LOG_TIMEOUT = 0.5


async def _send_log_async(level: str, message: str, context: dict[str, Any] | None = None) -> None:
    """Send a single log entry to Laravel (async, fire-and-forget)."""
    try:
        async with httpx.AsyncClient(timeout=LOG_TIMEOUT) as client:
            await client.post(
                LARAVEL_LOG_URL,
                json={
                    "level": level,
                    "message": message,
                    "context": context or {},
                }
            )
    except Exception:
        # Fire-and-forget: silently ignore errors
        pass


def log_to_laravel(level: str, message: str, context: dict[str, Any] | None = None) -> None:
    """
    Send a log entry to Laravel without waiting for response.
    
    This function returns immediately and sends the log in the background.
    If the request fails, it fails silently.
    
    Args:
        level: Log level (debug, info, warning, error)
        message: Log message
        context: Optional context dict
    """
    try:
        loop = asyncio.get_running_loop()
        # Schedule the coroutine without waiting
        loop.create_task(_send_log_async(level, message, context))
    except RuntimeError:
        # No running loop - skip logging to Laravel
        pass


# Convenience functions
def debug(message: str, **context: Any) -> None:
    """Send debug log to Laravel."""
    log_to_laravel("debug", message, context if context else None)


def info(message: str, **context: Any) -> None:
    """Send info log to Laravel."""
    log_to_laravel("info", message, context if context else None)


def warning(message: str, **context: Any) -> None:
    """Send warning log to Laravel."""
    log_to_laravel("warning", message, context if context else None)


def error(message: str, **context: Any) -> None:
    """Send error log to Laravel."""
    log_to_laravel("error", message, context if context else None)
