"""
AI Service - Murder Mystery Game (Multi-Agent Version)

FastAPI server with LangGraph multi-agent orchestration.
Each persona is a separate agent with its own knowledge and state.
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

# Global instances
gamemaster: Optional[GameMasterAgent] = None
murder_graph = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize resources on startup"""
    global gamemaster, murder_graph
    
    logger.info("Initializing Murder Mystery Multi-Agent System...")
    
    # Initialize GameMaster with all persona agents
    gamemaster = GameMasterAgent(
        scenario=OFFICE_MURDER_SCENARIO,
        model_name=os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    )
    
    # Create the LangGraph
    murder_graph = create_murder_mystery_graph(gamemaster)
    
    logger.info("Multi-Agent System ready!")
    logger.info(f"Agents: {list(gamemaster.persona_agents.keys())}")
    
    yield
    
    # Cleanup
    gamemaster = None
    murder_graph = None
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


# === API Endpoints ===

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "murder-mystery-ai",
        "version": "2.0.0",
        "multi_agent": True,
        "agents": list(gamemaster.persona_agents.keys()) if gamemaster else []
    }


@app.post("/game/start", response_model=GameStartResponse)
async def start_game(request: GameStartRequest):
    """Initialize a new game session"""
    if not gamemaster:
        raise HTTPException(status_code=503, detail="GameMaster not initialized")
    
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
    if not gamemaster or not murder_graph:
        raise HTTPException(status_code=503, detail="Multi-agent system not initialized")
    
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
async def get_personas():
    """Get list of available personas"""
    if not gamemaster:
        raise HTTPException(status_code=503, detail="GameMaster not initialized")
    
    return {
        "personas": [
            {
                "slug": p["slug"],
                "name": p["name"],
                "role": p["role"],
                "description": p["public_description"]
            }
            for p in OFFICE_MURDER_SCENARIO["personas"]
        ]
    }


# === Debug Endpoints ===

@app.get("/debug/personas")
async def get_personas_debug():
    """Get all personas with their full knowledge for debugging"""
    if not gamemaster:
        raise HTTPException(status_code=503, detail="GameMaster not initialized")
    
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
    if not gamemaster:
        raise HTTPException(status_code=503, detail="GameMaster not initialized")
    
    state = gamemaster.get_game_state(game_id)
    if not state:
        raise HTTPException(status_code=404, detail="Game not found")
    
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
async def get_agents_info():
    """Get info about all loaded agents"""
    if not gamemaster:
        raise HTTPException(status_code=503, detail="GameMaster not initialized")
    
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
