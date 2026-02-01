"""
Progress Service for broadcasting generation progress to Laravel.

Uses fire-and-forget HTTP calls to Laravel, which then broadcasts
via WebSocket (Reverb) to the frontend.
"""

import asyncio
import logging
import os
from dataclasses import dataclass
from enum import Enum
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# Laravel endpoint for receiving progress updates
LARAVEL_PROGRESS_URL = os.getenv("LARAVEL_API_URL", "http://nginx:80") + "/api/internal/progress"

# Timeout for fire-and-forget requests
PROGRESS_TIMEOUT = 1.0


class ProgressStage(str, Enum):
    """Progress stages for scenario generation."""
    STARTED = "started"
    GENERATING_SCENARIO = "generating_scenario"
    SCENARIO_COMPLETE = "scenario_complete"
    GENERATING_PERSONAS = "generating_personas"
    PERSONA_COMPLETE = "persona_complete"
    GENERATING_IMAGES = "generating_images"
    INITIALIZING_GAME = "initializing_game"
    COMPLETE = "complete"
    ERROR = "error"


@dataclass
class ProgressUpdate:
    """Progress update data."""
    game_id: str
    stage: ProgressStage
    progress: int  # 0-100
    message: str
    persona_name: Optional[str] = None
    persona_index: Optional[int] = None
    total_personas: Optional[int] = None


async def _send_progress_async(update: ProgressUpdate) -> None:
    """Send a progress update to Laravel (async, fire-and-forget)."""
    try:
        async with httpx.AsyncClient(timeout=PROGRESS_TIMEOUT) as client:
            payload = {
                "game_id": update.game_id,
                "stage": update.stage.value,
                "progress": update.progress,
                "message": update.message,
            }
            
            if update.persona_name:
                payload["persona_name"] = update.persona_name
            if update.persona_index is not None:
                payload["persona_index"] = update.persona_index
            if update.total_personas is not None:
                payload["total_personas"] = update.total_personas
            
            await client.post(LARAVEL_PROGRESS_URL, json=payload)
            logger.debug(f"Progress sent: {update.stage.value} - {update.progress}%")
    except Exception as e:
        # Fire-and-forget: log but don't fail
        logger.warning(f"Failed to send progress update: {e}")


async def send_progress(update: ProgressUpdate) -> None:
    """
    Send a progress update to Laravel and wait for completion.
    
    Progress updates must complete before continuing to ensure
    the frontend receives them before the API response.
    """
    await _send_progress_async(update)


# Alias for backwards compatibility
send_progress_await = send_progress


# Convenience functions for common progress updates (all async)

async def started(game_id: str) -> None:
    """Signal that generation has started."""
    await send_progress(ProgressUpdate(
        game_id=game_id,
        stage=ProgressStage.STARTED,
        progress=0,
        message="Generierung gestartet..."
    ))


async def generating_scenario(game_id: str) -> None:
    """Signal that base scenario is being generated."""
    await send_progress(ProgressUpdate(
        game_id=game_id,
        stage=ProgressStage.GENERATING_SCENARIO,
        progress=10,
        message="Szenario wird erstellt..."
    ))


async def scenario_complete(game_id: str) -> None:
    """Signal that base scenario is complete."""
    await send_progress(ProgressUpdate(
        game_id=game_id,
        stage=ProgressStage.SCENARIO_COMPLETE,
        progress=40,
        message="Szenario erstellt, Charaktere werden generiert..."
    ))


async def generating_personas(game_id: str, total: int) -> None:
    """Signal that persona generation is starting."""
    await send_progress(ProgressUpdate(
        game_id=game_id,
        stage=ProgressStage.GENERATING_PERSONAS,
        progress=45,
        message=f"Generiere {total} Charaktere parallel...",
        total_personas=total
    ))


async def persona_complete(game_id: str, name: str, index: int, total: int) -> None:
    """Signal that a persona has been generated."""
    # Progress from 45% to 80% based on personas completed
    base_progress = 45
    progress_per_persona = 35 / total
    progress = int(base_progress + (progress_per_persona * (index + 1)))
    
    await send_progress(ProgressUpdate(
        game_id=game_id,
        stage=ProgressStage.PERSONA_COMPLETE,
        progress=progress,
        message=f"Charakter '{name}' erstellt ({index + 1}/{total})",
        persona_name=name,
        persona_index=index,
        total_personas=total
    ))


async def generating_images(game_id: str) -> None:
    """Signal that crime scene images are being generated."""
    await send_progress(ProgressUpdate(
        game_id=game_id,
        stage=ProgressStage.GENERATING_IMAGES,
        progress=85,
        message="Tatort-Bilder werden generiert..."
    ))


async def initializing_game(game_id: str) -> None:
    """Signal that game is being initialized."""
    await send_progress(ProgressUpdate(
        game_id=game_id,
        stage=ProgressStage.INITIALIZING_GAME,
        progress=95,
        message="Spiel wird initialisiert..."
    ))


async def complete(game_id: str) -> None:
    """Signal that generation is complete."""
    await send_progress(ProgressUpdate(
        game_id=game_id,
        stage=ProgressStage.COMPLETE,
        progress=100,
        message="Generierung abgeschlossen!"
    ))


async def error(game_id: str, error_message: str) -> None:
    """Signal that an error occurred."""
    await send_progress(ProgressUpdate(
        game_id=game_id,
        stage=ProgressStage.ERROR,
        progress=0,
        message=f"Fehler: {error_message}"
    ))
