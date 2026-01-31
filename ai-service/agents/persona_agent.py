"""
PersonaAgent - Individual character agent in the murder mystery.

Each persona (Elena, Tom, Lisa, Klaus) is a separate agent with:
- Access to SHARED knowledge (from GameState)
- Their own PRIVATE knowledge (from persona_data)
- Their own dynamic state (stress, lies_told, etc.)
- Voice generation capability via ElevenLabs
"""

import logging
from typing import Optional

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from .state import GameState, Message

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
    
    def __init__(self, persona_data: dict, llm: ChatOpenAI, voice_id: Optional[str] = None, voice_service = None):
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
        
        logger.info(f"PersonaAgent {self.name} initialized with voice_id: {voice_id[:20] if voice_id else 'None'}...")
    
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
        
        Combines:
        - Shared knowledge (from state)
        - Private knowledge (from persona_data)
        - Dynamic state (stress level, interrogation count)
        """
        agent_state = state["agent_states"].get(self.slug, {})
        stress = agent_state.get("stress_level", 0.0)
        interrogation_count = agent_state.get("interrogation_count", 0)
        
        # Base prompt with role
        prompt = f"""You are {self.name}, {self.role} at InnoTech GmbH.

=== YOUR PERSONALITY ===
{self.personality}

=== YOUR PRIVATE KNOWLEDGE (only you know this, don't reveal it directly!) ===
{self.private_knowledge}

=== WHAT EVERYONE KNOWS (public facts) ===
{state["shared_facts"]}

=== CASE TIMELINE ===
{state["timeline"]}

=== WHAT YOU KNOW ABOUT OTHERS ===
{self.knows_about_others}

=== BEHAVIOR RULES ===
1. ALWAYS stay in character as {self.name}
2. Respond in English
3. Keep answers short (2-4 sentences), like in a real conversation
4. NEVER reveal your secrets directly, but:
   - Show nervousness or discomfort on sensitive topics
   - Become slightly more open when pressed repeatedly
   - Make small "slips" that could give hints
5. When asked about other people, use your knowledge about them
6. You do NOT know who the murderer is (unless you are the murderer yourself)
7. Only answer what is asked, don't proactively tell everything
"""
        
        # Add stress-based behavior modifications
        if stress > 0.3:
            prompt += f"""
=== CURRENT STATE ===
Stress Level: {stress:.0%}
You're becoming noticeably more nervous. Your answers get shorter, you hesitate more.
"""
        
        if stress > 0.6:
            prompt += """You are very stressed. You make small mistakes in your statements.
When directly confronted, you might slip up.
"""
        
        if interrogation_count > 5:
            prompt += f"""
You've been questioned {interrogation_count} times already. You're getting tired and less careful.
"""
        
        return prompt
    
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
        
        # Detect if we revealed a clue
        detected_clue = self._detect_revealed_clue(response_text)
        
        # Generate audio if voice service is available
        audio_base64 = None
        if self.voice_service and self.voice_id:
            try:
                logger.info(f"Generating audio for {self.name}'s response...")
                audio_bytes = await self.voice_service.text_to_speech(response_text, self.voice_id)
                if audio_bytes:
                    audio_base64 = self.voice_service.audio_to_base64(audio_bytes)
                    logger.info(f"Audio generated successfully ({len(audio_base64)} base64 chars)")
                else:
                    logger.warning("Audio generation returned None")
            except Exception as e:
                logger.error(f"Failed to generate audio for {self.name}: {e}", exc_info=True)
        
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
        state["audio_base64"] = audio_base64
        state["voice_id"] = self.voice_id
        
        # Add to message history
        new_message = Message(
            role="assistant",
            persona_slug=self.slug,
            content=response_text
        )
        state["messages"] = [new_message]  # Will be accumulated via Annotated[..., add]
        
        logger.info(f"=== {self.name} AGENT COMPLETE ===")
        
        return state
    
    def __repr__(self) -> str:
        return f"PersonaAgent(slug={self.slug}, name={self.name})"
