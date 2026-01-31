"""
AI Service - Murder Mystery Game (Multi-Agent Version)

FastAPI server with LangGraph multi-agent orchestration.
Each persona is a separate agent with its own knowledge and state.

Prompts and scenarios are loaded from the Laravel database via PromptService.
"""

import os
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


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    persona_slug: str
    response: str
    persona_name: str
    revealed_clue: Optional[str] = None
    agent_stress: float = 0.0
    interrogation_count: int = 0


class GameStartRequest(BaseModel):
    """Request for starting a new game"""
    game_id: str


class GameStartResponse(BaseModel):
    """Response for game start"""
    game_id: str
    scenario_name: str
    setting: str
    victim: str
    personas: list[dict]
    intro_message: str


class ScenarioGenerateRequest(BaseModel):
    """Request for generating a new scenario"""
    game_id: str
    user_input: str = ""
    difficulty: str = "mittel"


class ScenarioGenerateResponse(BaseModel):
    """Response for scenario generation"""
    success: bool
    game_id: str
    scenario_name: str


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
        }
    except Exception as e:
        logger.error(f"Error loading default scenario: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to load scenario: {e}")


@app.post("/scenario/generate", response_model=ScenarioGenerateResponse)
async def generate_scenario(request: ScenarioGenerateRequest):
    """
    Generate a new scenario and initialize GameMaster for this game.
    
    This creates a unique scenario for the game_id.
    """
    if not scenario_generator:
        raise HTTPException(status_code=503, detail="Scenario generator not initialized")
    
    logger.info(f"Generating scenario for game {request.game_id}")
    
    try:
        # Generate the scenario
        scenario = scenario_generator.generate(
            user_input=request.user_input,
            difficulty=request.difficulty
        )
        
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
        
        logger.info(f"✅ Game {request.game_id} initialized with scenario: {scenario['name']}")
        
        return ScenarioGenerateResponse(
            success=True,
            game_id=request.game_id,
            scenario_name=scenario["name"]
        )
        
    except Exception as e:
        logger.error(f"Failed to generate scenario: {e}", exc_info=True)
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
        
        logger.info(f"=== GRAPH INVOCATION ===")
        logger.info(f"Game: {request.game_id}")
        logger.info(f"Persona: {request.persona_slug}")
        logger.info(f"Message: {request.message[:50]}...")
        
        # Invoke the LangGraph
        final_state = await murder_graph.ainvoke(state)
        
        # Update stored game state
        gamemaster.update_game_state(request.game_id, final_state)
        
        # Get agent info for response
        agent = gamemaster.get_persona_agent(request.persona_slug)
        agent_state = final_state.get("agent_states", {}).get(request.persona_slug, {})
        
        logger.info(f"=== GRAPH COMPLETE ===")
        logger.info(f"Response from: {final_state.get('responding_agent')}")
        
        return ChatResponse(
            persona_slug=final_state.get("responding_agent", request.persona_slug),
            response=final_state.get("final_response", ""),
            persona_name=agent.name if agent else request.persona_slug,
            revealed_clue=final_state.get("detected_clue"),
            agent_stress=agent_state.get("stress_level", 0.0),
            interrogation_count=agent_state.get("interrogation_count", 0)
        )
        
    except Exception as e:
        logger.error(f"Error in chat: {e}", exc_info=True)
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
