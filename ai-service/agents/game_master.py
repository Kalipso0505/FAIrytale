"""
GameMaster - The orchestrator agent for the murder mystery game.

Uses LangGraph to manage state and coordinate between personas.
"""

import os
import logging
from typing import Optional, TypedDict, Annotated
from operator import add

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, END

# Setup logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class GameState(TypedDict):
    """State that is shared across the game session"""
    game_id: str
    messages: Annotated[list, add]  # Chat history accumulates
    revealed_clues: list[str]  # Clues the player has discovered
    current_persona: str  # Who is being talked to


class GameMaster:
    """
    Orchestrates the murder mystery game.
    
    Manages:
    - Game state (shared knowledge, revealed clues)
    - Persona interactions
    - Response generation via LangGraph
    """
    
    def __init__(self, scenario: dict, model_name: str = "gpt-4o-mini"):
        self.scenario = scenario
        self.model_name = model_name
        self.games: dict[str, dict] = {}  # Store game states
        
        # Initialize LLM
        self.llm = ChatOpenAI(
            model=model_name,
            temperature=0.8,  # Some creativity for natural responses
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # Build persona lookup
        self.personas = {p["slug"]: p for p in scenario["personas"]}
    
    def start_game(self, game_id: str) -> dict:
        """Initialize a new game session"""
        self.games[game_id] = {
            "revealed_clues": [],
            "chat_history": {},  # Per-persona chat history
            "interrogation_count": {p: 0 for p in self.personas}
        }
        
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
                    "description": p["public_description"]
                }
                for p in self.scenario["personas"]
            ],
            "intro_message": self.scenario["intro_message"]
        }
    
    def _build_system_prompt(self, persona_slug: str, game_id: str) -> str:
        """Build the system prompt for a persona"""
        persona = self.personas[persona_slug]
        game = self.games.get(game_id, {})
        interrogation_count = game.get("interrogation_count", {}).get(persona_slug, 0)
        
        # Base personality and knowledge
        system_prompt = f"""You are {persona['name']}, {persona['role']}.

YOUR PERSONALITY:
{persona['personality']}

YOUR SECRET KNOWLEDGE (don't reveal it directly, but let it show through your behavior):
{persona['private_knowledge']}

WHAT EVERYONE KNOWS:
{self.scenario['shared_knowledge']}

CASE TIMELINE:
{self.scenario['timeline']}

WHAT YOU KNOW ABOUT OTHERS:
{persona['knows_about_others']}

IMPORTANT RULES:
1. ALWAYS stay in your role as {persona['name']}
2. Respond in English
3. Keep answers short (2-4 sentences), like in a real conversation
4. Never reveal your secrets directly, but:
   - Show nervousness or discomfort about sensitive topics
   - Become more detailed when asked repeatedly
   - Make small "slips" that give hints
5. When asked about other people, use your knowledge about them
6. You do NOT know who the murderer is (unless you are the murderer yourself)
7. Only answer what is asked, don't proactively tell everything

BEHAVIOR HINTS BASED ON NUMBER OF INTERROGATIONS:
- For the first questions: Be reserved, give basic information
- After 3+ questions: Become somewhat more open, show more emotions
- After 5+ questions: Under pressure you might "accidentally" mention important details
"""
        
        # Add pressure based on interrogation count
        if interrogation_count > 5:
            system_prompt += f"\n\nYou have now been questioned {interrogation_count} times. You are getting tired and more careless."
        
        return system_prompt
    
    def _format_chat_history(self, chat_history: list[dict]) -> list:
        """Convert chat history to LangChain message format"""
        messages = []
        for msg in chat_history[-10:]:  # Keep last 10 messages for context
            if msg.get("role") == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg.get("role") == "assistant":
                messages.append(AIMessage(content=msg["content"]))
        return messages
    
    def _detect_revealed_clue(self, response: str, persona_slug: str) -> Optional[str]:
        """Check if the response reveals an important clue"""
        clue_keywords = {
            "tom": ["21:15", "zugangskarte", "sonntag", "abend", "trophäe", "hand", "schnitt"],
            "lisa": ["e-mail", "diebstahl", "geheimnisse", "streit am freitag"],
            "klaus": ["gesehen", "21", "blut", "flur"],
            "elena": ["investoren", "kontrolle", "streit mit marcus"]
        }
        
        response_lower = response.lower()
        revealed = []
        
        for keyword in clue_keywords.get(persona_slug, []):
            if keyword in response_lower:
                revealed.append(f"{persona_slug}: erwähnte '{keyword}'")
        
        return revealed[0] if revealed else None
    
    async def chat(
        self, 
        game_id: str, 
        persona_slug: str, 
        user_message: str,
        chat_history: list[dict]
    ) -> dict:
        """
        Send a message to a persona and get their response.
        
        This is where LangGraph would orchestrate the flow,
        but for the prototype we use a simpler direct approach.
        """
        # Ensure game exists
        if game_id not in self.games:
            self.start_game(game_id)
        
        game = self.games[game_id]
        persona = self.personas[persona_slug]
        
        # Increment interrogation count
        game["interrogation_count"][persona_slug] = \
            game["interrogation_count"].get(persona_slug, 0) + 1
        
        # Build messages for LLM
        system_prompt = self._build_system_prompt(persona_slug, game_id)
        messages = [SystemMessage(content=system_prompt)]
        
        # Add chat history
        messages.extend(self._format_chat_history(chat_history))
        
        # Add current user message
        messages.append(HumanMessage(content=user_message))
        
        # DEBUG: Log the full prompt
        logger.info(f"""
=== AGENT CALL DEBUG ===
Persona: {persona["name"]} ({persona_slug})
Interrogation Count: {game["interrogation_count"][persona_slug]}
User Message: {user_message}
System Prompt Length: {len(system_prompt)} chars
Full System Prompt:
{system_prompt}
========================
        """)
        
        # Get response from LLM
        response = await self.llm.ainvoke(messages)
        response_text = response.content
        
        # DEBUG: Log the response
        logger.info(f"""
=== AGENT RESPONSE ===
Persona: {persona["name"]}
Response: {response_text}
======================
        """)
        
        # Check for revealed clues
        revealed_clue = self._detect_revealed_clue(response_text, persona_slug)
        if revealed_clue and revealed_clue not in game["revealed_clues"]:
            game["revealed_clues"].append(revealed_clue)
        
        return {
            "persona_slug": persona_slug,
            "persona_name": persona["name"],
            "response": response_text,
            "revealed_clue": revealed_clue
        }
