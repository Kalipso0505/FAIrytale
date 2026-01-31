"""
PersonaAgent - Individual character agent in the murder mystery.

Each persona (Elena, Tom, Lisa, Klaus) is a separate agent with:
- Access to SHARED knowledge (from GameState)
- Their own PRIVATE knowledge (from persona_data)
- Their own dynamic state (stress, lies_told, etc.)
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
    
    def __init__(self, persona_data: dict, llm: ChatOpenAI):
        self.slug = persona_data["slug"]
        self.name = persona_data["name"]
        self.role = persona_data["role"]
        self.persona_data = persona_data
        self.llm = llm
        
        # Private knowledge - ONLY this agent knows this
        self.private_knowledge = persona_data["private_knowledge"]
        self.personality = persona_data["personality"]
        self.knows_about_others = persona_data["knows_about_others"]
        
        # Clue detection keywords for this persona
        self.clue_keywords = self._setup_clue_keywords()
    
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
        prompt = f"""Du bist {self.name}, {self.role} bei der InnoTech GmbH.

=== DEINE PERSÖNLICHKEIT ===
{self.personality}

=== DEIN PRIVATES WISSEN (nur du weißt das, verrate es nicht direkt!) ===
{self.private_knowledge}

=== WAS ALLE WISSEN (öffentliche Fakten) ===
{state["shared_facts"]}

=== ZEITLEISTE DES FALLS ===
{state["timeline"]}

=== WAS DU ÜBER ANDERE WEISST ===
{self.knows_about_others}

=== VERHALTENSREGELN ===
1. Bleibe IMMER in deiner Rolle als {self.name}
2. Antworte auf Deutsch
3. Halte Antworten kurz (2-4 Sätze), wie in einem echten Gespräch
4. Verrate deine Geheimnisse NIEMALS direkt, aber:
   - Zeige Nervosität oder Unbehagen bei heiklen Themen
   - Werde bei wiederholtem Nachfragen etwas offener
   - Mache kleine "Versprecher" die Hinweise geben könnten
5. Wenn du nach anderen Personen gefragt wirst, nutze dein Wissen über sie
6. Du weißt NICHT wer der Mörder ist (außer du bist es selbst)
7. Beantworte nur was gefragt wird, erzähle nicht proaktiv alles
"""
        
        # Add stress-based behavior modifications
        if stress > 0.3:
            prompt += f"""
=== AKTUELLER ZUSTAND ===
Stress-Level: {stress:.0%}
Du wirst merklich nervöser. Deine Antworten werden kürzer, du zögerst mehr.
"""
        
        if stress > 0.6:
            prompt += """Du bist sehr gestresst. Du machst kleine Fehler in deinen Aussagen.
Bei direkter Konfrontation könntest du dich verplappern.
"""
        
        if interrogation_count > 5:
            prompt += f"""
Du wurdest bereits {interrogation_count} mal befragt. Du wirst müde und unvorsichtiger.
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
