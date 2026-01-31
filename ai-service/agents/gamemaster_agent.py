"""
GameMasterAgent - The orchestrator of the murder mystery game.

The GameMaster:
- Initializes game state with shared knowledge
- Routes user messages to the correct persona agent
- Manages game flow and state transitions
- Could provide hints in the future
"""

import os
import logging
from typing import Optional

from langchain_openai import ChatOpenAI

from .state import GameState, create_initial_game_state, Message
from .persona_agent import PersonaAgent

logger = logging.getLogger(__name__)


class GameMasterAgent:
    """
    The central orchestrator for the murder mystery game.
    
    Responsibilities:
    - Initialize sub-agents for each persona
    - Create and manage game state
    - Route messages to correct persona
    - (Future) Provide hints and detect contradictions
    """
    
    def __init__(self, scenario: dict, model_name: str = "gpt-4o-mini"):
        self.scenario = scenario
        self.model_name = model_name
        
        # Initialize LLM
        self.llm = ChatOpenAI(
            model=model_name,
            temperature=0.8,  # Creative responses
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # Initialize persona agents - each is a SEPARATE agent instance
        self.persona_agents: dict[str, PersonaAgent] = {}
        for persona_data in scenario["personas"]:
            agent = PersonaAgent(persona_data, self.llm)
            self.persona_agents[persona_data["slug"]] = agent
            logger.info(f"Initialized agent: {agent}")
        
        # Game states storage (in-memory for now, could be Redis/DB)
        self.game_states: dict[str, GameState] = {}
        
        logger.info(f"GameMaster initialized with {len(self.persona_agents)} persona agents")
    
    def initialize_game(self, game_id: str) -> GameState:
        """
        Start a new game session.
        
        Creates initial state with all shared knowledge.
        """
        state = create_initial_game_state(game_id, self.scenario)
        self.game_states[game_id] = state
        
        logger.info(f"Game {game_id} initialized")
        return state
    
    def get_game_state(self, game_id: str) -> Optional[GameState]:
        """Get the current state of a game"""
        return self.game_states.get(game_id)
    
    def update_game_state(self, game_id: str, state: GameState) -> None:
        """Update the stored game state"""
        self.game_states[game_id] = state
    
    def get_game_info(self, game_id: str) -> dict:
        """Get public game info for the frontend"""
        if game_id not in self.game_states:
            self.initialize_game(game_id)
        
        return {
            "game_id": game_id,
            "scenario_name": self.scenario["name"],
            "setting": self.scenario["setting"],
            "victim": f"{self.scenario['victim']['name']} ({self.scenario['victim']['role']})",
            "personas": [
                {
                    "slug": p["slug"],
                    "name": p["name"],
                    "role": p["role"],
                    "description": p["public_description"],
                    "emoji": self._get_persona_emoji(p["slug"])
                }
                for p in self.scenario["personas"]
            ],
            "intro_message": self.scenario["intro_message"]
        }
    
    def _get_persona_emoji(self, slug: str) -> str:
        """Get emoji for a persona"""
        emojis = {
            "elena": "🏢",
            "tom": "💻",
            "lisa": "📋",
            "klaus": "🔧"
        }
        return emojis.get(slug, "👤")
    
    def router_node(self, state: GameState) -> str:
        """
        Router node for LangGraph.
        
        Decides which persona agent should handle the message.
        Currently: Uses the user's selected persona.
        Future: Could intelligently route based on question content.
        """
        selected = state.get("selected_persona", "")
        
        if selected not in self.persona_agents:
            logger.warning(f"Unknown persona {selected}, defaulting to elena")
            return "elena"
        
        logger.info(f"Routing to: {selected}")
        return selected
    
    def prepare_state_for_agent(
        self, 
        game_id: str, 
        persona_slug: str, 
        user_message: str,
        chat_history: list[dict]
    ) -> GameState:
        """
        Prepare the game state for an agent invocation.
        
        - Gets or creates game state
        - Sets current request info
        - Adds user message to history
        """
        # Get or create game state
        if game_id not in self.game_states:
            state = self.initialize_game(game_id)
        else:
            state = self.game_states[game_id].copy()
        
        # Set current request
        state["user_message"] = user_message
        state["selected_persona"] = persona_slug
        
        # Add user message to history
        user_msg = Message(
            role="user",
            persona_slug=None,
            content=user_message
        )
        
        # Include previous history
        existing_messages = []
        for msg in chat_history:
            existing_messages.append(Message(
                role=msg.get("role", "user"),
                persona_slug=msg.get("persona_slug"),
                content=msg.get("content", "")
            ))
        
        state["messages"] = existing_messages + [user_msg]
        
        return state
    
    def get_persona_agent(self, slug: str) -> Optional[PersonaAgent]:
        """Get a specific persona agent"""
        return self.persona_agents.get(slug)
    
    def get_all_personas_debug_info(self) -> list[dict]:
        """Get debug info for all personas (for debug dashboard)"""
        return [
            {
                "slug": agent.slug,
                "name": agent.name,
                "role": agent.role,
                "personality": agent.personality,
                "private_knowledge": agent.private_knowledge,
                "shared_knowledge": self.scenario["shared_knowledge"],
                "knows_about_others": agent.knows_about_others,
                "clue_keywords": agent.clue_keywords
            }
            for agent in self.persona_agents.values()
        ]
    
    def get_agent_state_debug(self, game_id: str) -> dict:
        """Get debug info about agent states for a game"""
        state = self.game_states.get(game_id)
        if not state:
            return {"error": "Game not found"}
        
        return {
            "game_id": game_id,
            "game_status": state.get("game_status", "unknown"),
            "revealed_clues": state.get("revealed_clues", []),
            "agent_states": state.get("agent_states", {}),
            "message_count": len(state.get("messages", []))
        }
