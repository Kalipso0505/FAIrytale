"""
AI Service - Murder Mystery Game (Multi-Agent Version)

FastAPI server with LangGraph multi-agent orchestration.
Each persona is a separate agent with its own knowledge and state.

Prompts and scenarios are loaded from the Laravel database via PromptService.
"""

import os
import asyncio
import logging
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from agents.gamemaster_agent import GameMasterAgent
from agents.graph import create_murder_mystery_graph, get_graph_visualization
from agents.state import Message
from scenarios.office_murder import OFFICE_MURDER_SCENARIO
from scenarios.default_scenario import DEFAULT_SCENARIO
from services.scenario_generator import ScenarioGenerator
from services.prompt_service import get_prompt_service
from services.image_generator import get_image_generator
from services import progress_service

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Validate OpenAI API key
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("OPENAI_API_KEY environment variable is required")

# Global instances - now per game_id
gamemasters: dict[str, GameMasterAgent] = {}
murder_graphs: dict[str, any] = {}
scenario_generator: Optional[ScenarioGenerator] = None


def get_default_scenario() -> dict:
    """
    Get the default scenario from the database or fallback to hardcoded.
    
    This allows Content Managers to update the default scenario via the database.
    """
    prompt_service = get_prompt_service()
    scenario = prompt_service.get_scenario("default_scenario")
    
    if scenario:
        logger.info("✅ Loaded default scenario from database")
        return scenario
    
    logger.warning("⚠️ Using hardcoded default scenario")
    return OFFICE_MURDER_SCENARIO


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize resources on startup"""
    global gamemasters, murder_graphs, scenario_generator
    
    logger.info("Initializing Murder Mystery Multi-Agent System...")
    
    # Pre-load prompts from database
    prompt_service = get_prompt_service()
    prompt_service.reload()
    
    # Initialize Scenario Generator
    scenario_generator = ScenarioGenerator(
        model_name=os.getenv("OPENAI_MODEL", "gpt-4o")  # Changed to gpt-4o for faster generation
    )
    
    logger.info("Multi-Agent System ready!")
    logger.info("GameMasters will be created dynamically per game")
    
    yield
    
    # Cleanup
    gamemasters.clear()
    murder_graphs.clear()
    scenario_generator = None
    logger.info("Shutdown complete")


app = FastAPI(
    title="Murder Mystery AI Service (Multi-Agent)",
    description="Multi-agent AI service using LangGraph for murder mystery games",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# === Request/Response Models ===

class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    game_id: str
    persona_slug: str
    message: str
    chat_history: list[dict] = []


class AutoNoteResponse(BaseModel):
    """Auto-generated note from the conversation"""
    text: str
    category: str  # alibi, motive, relationship, observation, contradiction
    timestamp: str
    source_message: str


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    persona_slug: str
    response: str
    persona_name: str
    revealed_clue: Optional[str] = None
    agent_stress: float = 0.0
    interrogation_count: int = 0
    new_auto_notes: list[AutoNoteResponse] = []  # Notes from this specific response
    all_auto_notes: dict[str, list[AutoNoteResponse]] = {}  # All notes grouped by persona
    audio_base64: Optional[str] = None  # Base64 encoded audio from ElevenLabs
    voice_id: Optional[str] = None  # Voice ID used for audio generation


class GameStartRequest(BaseModel):
    """Request for starting a new game"""
    game_id: str


class VictimInfo(BaseModel):
    """Victim information"""
    name: str
    role: str
    description: str = ""


class GameStartResponse(BaseModel):
    """Response for game start"""
    game_id: str
    scenario_name: str
    setting: str
    victim: VictimInfo
    location: str = "Unknown Location"
    time_of_incident: str = "Time unknown"
    timeline: str = ""
    personas: list[dict]
    intro_message: str
    crime_scene_images: list[str] = []  # Base64 encoded crime scene photos


class ScenarioGenerateRequest(BaseModel):
    """Request for generating a new scenario"""
    game_id: str
    user_input: str = ""
    difficulty: str = "mittel"


class GenerationMetricsResponse(BaseModel):
    """Metrics from scenario generation for logging"""
    total_sec: float
    phase1_sec: float
    phase2_sec: float
    retries: int = 0
    persona_times: dict[str, float] = {}


class ScenarioGenerateResponse(BaseModel):
    """Response for scenario generation"""
    success: bool
    game_id: str
    scenario_name: str
    metrics: Optional[GenerationMetricsResponse] = None
    crime_scene_images: list[str] = []  # Base64 encoded crime scene photos


class QuickStartRequest(BaseModel):
    """Request for quick start with default scenario"""
    game_id: str


# === API Endpoints ===

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "murder-mystery-ai",
        "version": "2.0.0",
        "multi_agent": True,
        "active_games": len(gamemasters)
    }


@app.post("/scenario/quick-start")
async def quick_start_scenario(request: QuickStartRequest):
    """
    Load the default pre-made scenario instantly (no AI generation).
    Perfect for testing and demos.
    """
    logger.info(f"Quick-starting default scenario for game_id: {request.game_id}")
    
    try:
        # Initialize a new GameMasterAgent with the default scenario
        new_gamemaster = GameMasterAgent(
            scenario=DEFAULT_SCENARIO,
            model_name=os.getenv("OPENAI_MODEL", "gpt-4o")
        )
        gamemasters[request.game_id] = new_gamemaster
        
        # Create a new graph for this gamemaster
        murder_graphs[request.game_id] = create_murder_mystery_graph(new_gamemaster)
        
        logger.info(f"Default scenario loaded instantly for game_id: {request.game_id}")
        
        # Generate crime scene images for default scenario
        image_generator = get_image_generator()
        crime_scene_images = await image_generator.generate_crime_scene_images(DEFAULT_SCENARIO)
        
        # Get game info for the response
        game_info = new_gamemaster.get_game_info(request.game_id)
        
        return {
            "success": True,
            "game_id": request.game_id,
            "scenario_name": game_info['scenario_name'],
            "setting": game_info['setting'],
            "victim": game_info['victim'],
            "location": game_info.get('location', 'Unknown Location'),
            "time_of_incident": game_info.get('time_of_incident', 'Time unknown'),
            "timeline": game_info.get('timeline', ''),
            "personas": game_info['personas'],
            "intro_message": game_info['intro_message'],
            "crime_scene_images": crime_scene_images,
        }
    except Exception as e:
        logger.error(f"Error loading default scenario: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to load scenario: {e}")


@app.post("/scenario/generate", response_model=ScenarioGenerateResponse)
async def generate_scenario(request: ScenarioGenerateRequest):
    """
    Generate a new scenario and initialize GameMaster for this game.
    
    Uses parallel persona generation for faster scenario creation.
    This creates a unique scenario for the game_id.
    """
    import time
    request_start = time.time()
    
    if not scenario_generator:
        raise HTTPException(status_code=503, detail="Scenario generator not initialized")
    
    logger.info("=" * 70)
    logger.info(f"📥 POST /scenario/generate")
    logger.info(f"   Game ID:    {request.game_id}")
    logger.info(f"   Difficulty: {request.difficulty}")
    logger.info(f"   Input:      {request.user_input[:50] + '...' if len(request.user_input) > 50 else request.user_input or '(random)'}")
    logger.info("=" * 70)
    
    try:
        # === PHASE 1: Generate base scenario ===
        phase1_start = time.time()
        base_scenario = await scenario_generator.generate_base_only(
            user_input=request.user_input,
            difficulty=request.difficulty,
            game_id=request.game_id
        )
        phase1_time = time.time() - phase1_start
        
        logger.info(f"   Phase 1 complete: {base_scenario.name} ({phase1_time:.2f}s)")
        
        # === PHASE 2 + IMAGES IN PARALLEL ===
        # Images only need the base scenario, so start them alongside persona generation!
        parallel_start = time.time()
        
        # Broadcast: Starting parallel work (personas + images)
        await progress_service.generating_images(request.game_id)
        
        async def generate_personas():
            """Phase 2: Generate detailed personas"""
            return await scenario_generator.generate_personas_from_base(
                base_scenario=base_scenario,
                difficulty=request.difficulty,
                game_id=request.game_id
            )
        
        async def generate_images():
            """Generate crime scene images (uses base scenario only)"""
            image_gen = get_image_generator()
            # Convert BaseScenarioModel to dict for image generator
            scenario_for_images = {
                "name": base_scenario.name,
                "setting": base_scenario.setting,
                "victim": base_scenario.victim.model_dump(),
                "solution": base_scenario.solution.model_dump(),
            }
            return await image_gen.generate_crime_scene_images(scenario_for_images)
        
        # Run BOTH in parallel - this is the key optimization!
        scenario, crime_scene_images = await asyncio.gather(
            generate_personas(),
            generate_images()
        )
        
        parallel_time = time.time() - parallel_start
        
        # === FINALIZE: GameMaster + Graph (fast, sync) ===
        await progress_service.initializing_game(request.game_id)
        
        gm_start = time.time()
        gamemaster = GameMasterAgent(
            scenario=scenario,
            model_name=os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        )
        graph = create_murder_mystery_graph(gamemaster)
        gm_time = time.time() - gm_start
        
        # Store them
        gamemasters[request.game_id] = gamemaster
        murder_graphs[request.game_id] = graph
        
        # Broadcast: Complete
        await progress_service.complete(request.game_id)
        
        total_time = time.time() - request_start
        
        logger.info("=" * 70)
        logger.info(f"✅ POST /scenario/generate COMPLETE")
        logger.info(f"   Game:           {request.game_id}")
        logger.info(f"   Scenario:       {scenario['name']}")
        logger.info(f"   Personas:       {len(scenario['personas'])}")
        logger.info(f"   Murderer:       {scenario['solution']['murderer']}")
        logger.info(f"   Images:         {len(crime_scene_images)}")
        logger.info("-" * 70)
        logger.info(f"   ⏱️  Phase 1:      {phase1_time:.2f}s (base scenario)")
        logger.info(f"   ⏱️  Parallel:     {parallel_time:.2f}s (Phase2 + Images)")
        logger.info(f"   ⏱️  GameMaster:   {gm_time:.2f}s")
        logger.info(f"   ⏱️  TOTAL:        {total_time:.2f}s")
        logger.info("=" * 70)
        
        # Extract metrics from scenario (added by generator)
        metrics_data = scenario.pop("_metrics", None)
        metrics_response = None
        if metrics_data:
            metrics_response = GenerationMetricsResponse(
                total_sec=metrics_data.get("total_sec", 0),
                phase1_sec=metrics_data.get("phase1_sec", 0),
                phase2_sec=metrics_data.get("phase2_sec", 0),
                retries=metrics_data.get("retries", 0),
                persona_times=metrics_data.get("persona_times", {})
            )
        
        return ScenarioGenerateResponse(
            success=True,
            game_id=request.game_id,
            scenario_name=scenario["name"],
            metrics=metrics_response,
            crime_scene_images=crime_scene_images
        )
        
    except Exception as e:
        total_time = time.time() - request_start
        logger.error("=" * 70)
        logger.error(f"❌ POST /scenario/generate FAILED after {total_time:.2f}s")
        logger.error(f"   Error: {e}")
        logger.error("=" * 70, exc_info=True)
        
        # Broadcast: Error
        await progress_service.error(request.game_id, str(e)[:100])
        
        raise HTTPException(status_code=500, detail=f"Scenario generation failed: {str(e)}")


@app.post("/game/start", response_model=GameStartResponse)
async def start_game(request: GameStartRequest):
    """Initialize a new game session"""
    gamemaster = gamemasters.get(request.game_id)
    
    if not gamemaster:
        raise HTTPException(
            status_code=404, 
            detail=f"Game {request.game_id} not found. Generate scenario first."
        )
    
    # Initialize game state
    gamemaster.initialize_game(request.game_id)
    
    # Get game info
    game_info = gamemaster.get_game_info(request.game_id)
    
    return GameStartResponse(**game_info)


@app.post("/chat", response_model=ChatResponse)
async def chat_with_persona(request: ChatRequest):
    """
    Send a message to a specific persona using the LangGraph.
    
    This is the main endpoint that invokes the multi-agent system.
    """
    import time
    request_start = time.time()
    
    gamemaster = gamemasters.get(request.game_id)
    murder_graph = murder_graphs.get(request.game_id)
    
    if not gamemaster or not murder_graph:
        raise HTTPException(
            status_code=404,
            detail=f"Game {request.game_id} not found. Start a game first."
        )
    
    # Validate persona
    valid_personas = list(gamemaster.persona_agents.keys())
    if request.persona_slug not in valid_personas:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid persona. Choose from: {valid_personas}"
        )
    
    try:
        # Prepare state for the graph
        state = gamemaster.prepare_state_for_agent(
            game_id=request.game_id,
            persona_slug=request.persona_slug,
            user_message=request.message,
            chat_history=request.chat_history
        )
        
        logger.info(f"💬 POST /chat - {request.persona_slug}")
        logger.info(f"   Game: {request.game_id[:8]}...")
        logger.info(f"   Message: \"{request.message[:60]}{'...' if len(request.message) > 60 else ''}\"")
        
        # Invoke the LangGraph
        graph_start = time.time()
        final_state = await murder_graph.ainvoke(state)
        graph_time = time.time() - graph_start
        
        # Update stored game state
        gamemaster.update_game_state(request.game_id, final_state)
        
        # Get agent info for response
        agent = gamemaster.get_persona_agent(request.persona_slug)
        agent_state = final_state.get("agent_states", {}).get(request.persona_slug, {})
        
        response_text = final_state.get("final_response", "")
        total_time = time.time() - request_start
        
        logger.info(f"   ✅ Response in {graph_time:.2f}s (total: {total_time:.2f}s)")
        logger.info(f"   Response: \"{response_text[:60]}{'...' if len(response_text) > 60 else ''}\"")
        logger.info(f"   Stress: {agent_state.get('stress_level', 0):.2f}, Interrogations: {agent_state.get('interrogation_count', 0)}")
        
        # Convert auto notes to response format
        new_notes = [
            AutoNoteResponse(
                text=note.get("text", ""),
                category=note.get("category", "observation"),
                timestamp=note.get("timestamp", ""),
                source_message=note.get("source_message", "")
            )
            for note in final_state.get("new_auto_notes", [])
        ]
        
        # Get all auto notes grouped by persona
        all_notes = {}
        for persona_slug, notes in final_state.get("auto_notes", {}).items():
            all_notes[persona_slug] = [
                AutoNoteResponse(
                    text=note.get("text", ""),
                    category=note.get("category", "observation"),
                    timestamp=note.get("timestamp", ""),
                    source_message=note.get("source_message", "")
                )
                for note in notes
            ]
        
        return ChatResponse(
            persona_slug=final_state.get("responding_agent", request.persona_slug),
            response=final_state.get("final_response", ""),
            persona_name=agent.name if agent else request.persona_slug,
            revealed_clue=final_state.get("detected_clue"),
            agent_stress=agent_state.get("stress_level", 0.0),
            interrogation_count=agent_state.get("interrogation_count", 0),
            new_auto_notes=new_notes,
            all_auto_notes=all_notes,
            audio_base64=final_state.get("audio_base64"),  # Added for voice integration
            voice_id=final_state.get("voice_id")  # Added for voice integration
        )
        
    except Exception as e:
        total_time = time.time() - request_start
        logger.error(f"   ❌ Chat failed after {total_time:.2f}s: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/personas")
async def get_personas(game_id: str):
    """Get list of available personas for a game"""
    gamemaster = gamemasters.get(game_id)
    
    if not gamemaster:
        raise HTTPException(
            status_code=404,
            detail=f"Game {game_id} not found"
        )
    
    return {
        "personas": [
            {
                "slug": agent.slug,
                "name": agent.name,
                "role": agent.role,
                "description": persona_data["public_description"]
            }
            for agent, persona_data in zip(
                gamemaster.persona_agents.values(),
                gamemaster.scenario["personas"]
            )
        ]
    }


# === Debug Endpoints ===

@app.get("/debug/personas")
async def get_personas_debug(game_id: str):
    """Get all personas with their full knowledge for debugging"""
    gamemaster = gamemasters.get(game_id)
    
    if not gamemaster:
        raise HTTPException(
            status_code=404,
            detail=f"Game {game_id} not found"
        )
    
    return {
        "personas": gamemaster.get_all_personas_debug_info()
    }


@app.get("/game/{game_id}/solution")
async def get_game_solution(game_id: str):
    """Get the solution for a game (murderer, motive, weapon, clues)"""
    gamemaster = gamemasters.get(game_id)
    
    if not gamemaster:
        raise HTTPException(
            status_code=404,
            detail=f"Game {game_id} not found"
        )
    
    solution = gamemaster.scenario.get("solution", {})
    personas = {p["slug"]: p for p in gamemaster.scenario.get("personas", [])}
    
    # Get murderer details
    murderer_slug = solution.get("murderer", "")
    murderer_persona = personas.get(murderer_slug, {})
    
    return {
        "murderer": {
            "slug": murderer_slug,
            "name": murderer_persona.get("name", "Unknown"),
            "role": murderer_persona.get("role", ""),
        },
        "motive": solution.get("motive", "Unknown motive"),
        "weapon": solution.get("weapon", "Unknown weapon"),
        "critical_clues": solution.get("critical_clues", []),
    }


@app.post("/game/{game_id}/hint")
async def get_hint(game_id: str):
    """Get a hint from the GameMaster to help the player progress"""
    gamemaster = gamemasters.get(game_id)
    
    if not gamemaster:
        raise HTTPException(
            status_code=404,
            detail=f"Game {game_id} not found"
        )
    
    try:
        hint_result = await gamemaster.generate_hint(game_id)
        return hint_result
    except Exception as e:
        logger.error(f"Error generating hint for game {game_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate hint: {str(e)}"
        )


@app.get("/debug/graph")
async def get_graph_debug():
    """Get the graph structure for visualization"""
    return get_graph_visualization()


@app.get("/debug/game/{game_id}/state")
async def get_game_state_debug(game_id: str):
    """Get the full game state for debugging"""
    gamemaster = gamemasters.get(game_id)
    
    if not gamemaster:
        raise HTTPException(
            status_code=404,
            detail=f"Game {game_id} not found"
        )
    
    state = gamemaster.get_game_state(game_id)
    if not state:
        raise HTTPException(status_code=404, detail="Game state not initialized")
    
    return {
        "game_id": game_id,
        "game_status": state.get("game_status"),
        "scenario_name": state.get("scenario_name"),
        "revealed_clues": state.get("revealed_clues", []),
        "agent_states": state.get("agent_states", {}),
        "message_count": len(state.get("messages", [])),
        "messages": state.get("messages", [])[-20:]  # Last 20 messages
    }


@app.get("/debug/agents")
async def get_agents_info(game_id: str):
    """Get info about all loaded agents for a game"""
    gamemaster = gamemasters.get(game_id)
    
    if not gamemaster:
        raise HTTPException(
            status_code=404,
            detail=f"Game {game_id} not found"
        )
    
    return {
        "agents": [
            {
                "slug": agent.slug,
                "name": agent.name,
                "role": agent.role,
                "clue_keywords": agent.clue_keywords
            }
            for agent in gamemaster.persona_agents.values()
        ],
        "graph_nodes": ["router"] + list(gamemaster.persona_agents.keys()),
        "multi_agent_enabled": True
    }


# === Admin/Management Endpoints ===

@app.post("/admin/prompts/reload")
async def reload_prompts():
    """
    Reload all prompts from the Laravel database.
    
    Call this after updating prompts in the database to apply changes
    without restarting the AI service.
    """
    prompt_service = get_prompt_service()
    prompt_service.reload()
    
    return {
        "status": "success",
        "message": "Prompts reloaded from database"
    }


@app.post("/scenario/default", response_model=ScenarioGenerateResponse)
async def use_default_scenario(request: GameStartRequest):
    """
    Initialize a game with the default scenario from the database.
    
    This is faster than generating a new scenario and useful for testing
    or when users want the standard InnoTech case.
    """
    logger.info(f"Using default scenario for game {request.game_id}")
    
    try:
        # Get default scenario from database or fallback
        scenario = get_default_scenario()
        
        # Create GameMaster for this game
        gamemaster = GameMasterAgent(
            scenario=scenario,
            model_name=os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        )
        
        # Create the graph
        graph = create_murder_mystery_graph(gamemaster)
        
        # Store them
        gamemasters[request.game_id] = gamemaster
        murder_graphs[request.game_id] = graph
        
        logger.info(f"✅ Game {request.game_id} initialized with default scenario: {scenario['name']}")
        
        return ScenarioGenerateResponse(
            success=True,
            game_id=request.game_id,
            scenario_name=scenario["name"]
        )
        
    except Exception as e:
        logger.error(f"Failed to use default scenario: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to load default scenario: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
