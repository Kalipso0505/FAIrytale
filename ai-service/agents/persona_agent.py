"""
PersonaAgent - Individual character agent in the murder mystery.

Each persona (Elena, Tom, Lisa, Klaus) is a separate agent with:
- Access to SHARED knowledge (from GameState)
- Their own PRIVATE knowledge (from persona_data)
- Their own dynamic state (stress, lies_told, etc.)

Prompts are loaded from the Laravel database via PromptService.
"""

import logging
from typing import Optional

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from .state import GameState, Message
from services.prompt_service import get_prompt_service
from services.voice_service import VoiceService

logger = logging.getLogger(__name__)


class PersonaAgent:
    """
    An individual persona agent that can be invoked by the LangGraph.
    
    Each persona has:
    - slug: unique identifier (e.g., "tom")
    - name: display name (e.g., "Tom Berger")
    - persona_data: full character definition including private knowledge
    - llm: the language model to use
    """
    
    def __init__(self, persona_data: dict, llm: ChatOpenAI, voice_id: Optional[str] = None, voice_service: Optional[VoiceService] = None):
        self.slug = persona_data["slug"]
        self.name = persona_data["name"]
        self.role = persona_data["role"]
        self.persona_data = persona_data
        self.llm = llm
        self.voice_id = voice_id
        self.voice_service = voice_service
        
        # Private knowledge - ONLY this agent knows this
        self.private_knowledge = persona_data["private_knowledge"]
        self.personality = persona_data["personality"]
        self.knows_about_others = persona_data["knows_about_others"]
        
        # Clue detection keywords for this persona
        self.clue_keywords = self._setup_clue_keywords()
        
        logger.info(f"PersonaAgent {self.name} initialized with voice: {voice_id[:20] if voice_id else 'None'}...")
    
    def _setup_clue_keywords(self) -> list[str]:
        """Keywords that indicate this persona revealed important info"""
        keywords_map = {
            "tom": ["21:15", "zugangskarte", "sonntag abend", "trophäe", "hand", "schnitt", "geschnitten"],
            "lisa": ["e-mail", "diebstahl", "geheimnisse", "streit am freitag", "samstag"],
            "klaus": ["gesehen", "21 uhr", "blut", "flur", "tom gesehen"],
            "elena": ["investoren", "kontrolle", "streit mit marcus", "finanzen"]
        }
        return keywords_map.get(self.slug, [])
    
    def _build_system_prompt(self, state: GameState) -> str:
        """
        Build the system prompt for this persona.
        
        Uses the prompt template from the database (via PromptService).
        Combines:
        - Shared knowledge (from state)
        - Private knowledge (from persona_data)
        - Dynamic state (stress level, interrogation count)
        """
        agent_state = state["agent_states"].get(self.slug, {})
        stress = agent_state.get("stress_level", 0.0)
        interrogation_count = agent_state.get("interrogation_count", 0)
        
        # Build stress modifier based on current state
        stress_modifier = ""
        if stress > 0.3:
            stress_modifier += f"""
=== AKTUELLER ZUSTAND ===
Stress-Level: {stress:.0%}
Du wirst merklich nervöser. Deine Antworten werden kürzer, du zögerst mehr.
"""
        
        if stress > 0.6:
            stress_modifier += """Du bist sehr gestresst. Du machst kleine Fehler in deinen Aussagen.
Bei direkter Konfrontation könntest du dich verplappern.
"""
        
        if interrogation_count > 5:
            stress_modifier += f"""
Du wurdest bereits {interrogation_count} mal befragt. Du wirst müde und unvorsichtiger.
"""
        
        # Get formatted prompt from PromptService
        prompt_service = get_prompt_service()
        
        # Extract company name from scenario_name or use default
        company_name = state.get("scenario_name", "InnoTech GmbH")
        if "InnoTech" not in company_name:
            company_name = "der Firma"
        else:
            company_name = "InnoTech GmbH"
        
        return prompt_service.format_persona_prompt(
            persona_name=self.name,
            persona_role=self.role,
            company_name=company_name,
            personality=self.personality,
            private_knowledge=self.private_knowledge,
            shared_facts=state["shared_facts"],
            timeline=state["timeline"],
            knows_about_others=self.knows_about_others,
            stress_modifier=stress_modifier
        )
    
    def _get_persona_history(self, state: GameState) -> list:
        """
        Get only the chat history relevant to THIS persona.
        
        Important: We don't share history between personas!
        """
        messages = []
        for msg in state.get("messages", [])[-10:]:  # Last 10 messages
            # Only include messages TO this persona or FROM this persona
            if msg.get("persona_slug") is None:
                # User message - include if it was to this persona
                messages.append(HumanMessage(content=msg["content"]))
            elif msg.get("persona_slug") == self.slug:
                # This persona's response
                messages.append(AIMessage(content=msg["content"]))
        return messages
    
    def _detect_revealed_clue(self, response: str) -> Optional[str]:
        """Check if the response accidentally reveals important information"""
        response_lower = response.lower()
        
        for keyword in self.clue_keywords:
            if keyword in response_lower:
                return f"{self.name} erwähnte '{keyword}'"
        
        return None
    
    async def invoke(self, state: GameState) -> GameState:
        """
        Main agent invocation - called by LangGraph.
        
        1. Reads shared knowledge from state
        2. Uses own private knowledge
        3. Generates response
        4. Updates state with response and dynamic changes
        """
        logger.info(f"=== {self.name} AGENT INVOKED ===")
        logger.info(f"User message: {state['user_message']}")
        
        # Build system prompt
        system_prompt = self._build_system_prompt(state)
        
        # Get chat history for this persona only
        history = self._get_persona_history(state)
        
        # Build messages for LLM
        messages = [
            SystemMessage(content=system_prompt),
            *history,
            HumanMessage(content=state["user_message"])
        ]
        
        logger.info(f"System prompt length: {len(system_prompt)} chars")
        
        # Call LLM
        response = await self.llm.ainvoke(messages)
        response_text = response.content
        
        logger.info(f"Response: {response_text[:100]}...")
        
        # Generate audio using ElevenLabs if voice_service is available
        audio_base64 = None
        if self.voice_service and self.voice_id:
            try:
                audio_bytes = await self.voice_service.text_to_speech(response_text, self.voice_id)
                if audio_bytes:
                    audio_base64 = self.voice_service.audio_to_base64(audio_bytes)
                    logger.info(f"Generated audio for {self.name}: {len(audio_bytes)} bytes")
            except Exception as e:
                logger.error(f"Failed to generate audio for {self.name}: {e}")
        
        # Detect if we revealed a clue
        detected_clue = self._detect_revealed_clue(response_text)
        
        # Update agent's dynamic state
        agent_state = state["agent_states"].get(self.slug, {})
        agent_state["stress_level"] = min(1.0, agent_state.get("stress_level", 0) + 0.1)
        agent_state["interrogation_count"] = agent_state.get("interrogation_count", 0) + 1
        state["agent_states"][self.slug] = agent_state
        
        # Update revealed clues if we found one
        if detected_clue and detected_clue not in state.get("revealed_clues", []):
            state["revealed_clues"] = state.get("revealed_clues", []) + [detected_clue]
        
        # Set response in state
        state["final_response"] = response_text
        state["responding_agent"] = self.slug
        state["detected_clue"] = detected_clue
        state["audio_base64"] = audio_base64  # Added for voice integration
        state["voice_id"] = self.voice_id  # Added for voice integration
        
        # Add to message history
        new_message = Message(
            role="assistant",
            persona_slug=self.slug,
            content=response_text,
            audio_base64=audio_base64,  # Added for voice integration
            voice_id=self.voice_id  # Added for voice integration
        )
        state["messages"] = [new_message]  # Will be accumulated via Annotated[..., add]
        
        logger.info(f"=== {self.name} AGENT COMPLETE ===")
        
        return state
    
    def __repr__(self) -> str:
        return f"PersonaAgent(slug={self.slug}, name={self.name})"
