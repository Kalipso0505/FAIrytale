"""
PersonaAgent - Individual character agent in the murder mystery.

Each persona (Elena, Tom, Lisa, Klaus) is a separate agent with:
- Access to SHARED knowledge (from GameState)
- Their own PRIVATE knowledge (from persona_data)
- Their own dynamic state (stress, lies_told, etc.)

Prompts are loaded from the Laravel database via PromptService.
"""

import json
import logging
from datetime import datetime
from typing import Optional

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from .state import GameState, Message, AutoNote
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
    
    def __init__(self, persona_data: dict, llm: ChatOpenAI, voice_id: Optional[str] = None, voice_service: Optional[VoiceService] = None, clue_keywords: Optional[list[str]] = None):
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
        
        # Clue detection keywords - from scenario or fallback to defaults
        self.clue_keywords = clue_keywords if clue_keywords else self._setup_default_clue_keywords()
        
        logger.info(f"PersonaAgent {self.name} initialized with {len(self.clue_keywords)} clue keywords, voice: {voice_id[:20] if voice_id else 'None'}...")
    
    def _setup_default_clue_keywords(self) -> list[str]:
        """Fallback keywords for old scenarios without clue_keywords defined"""
        # Legacy keywords for old InnoTech scenario
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
=== CURRENT STATE ===
Stress Level: {stress:.0%}
You are becoming noticeably more nervous. Your answers are getting shorter, you hesitate more.
"""
        
        if stress > 0.6:
            stress_modifier += """You are very stressed. You are making small mistakes in your statements.
When confronted directly, you might slip up.
"""
        
        if interrogation_count > 5:
            stress_modifier += f"""
You have already been questioned {interrogation_count} times. You are getting tired and more careless.
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
            keyword_lower = keyword.lower()
            if keyword_lower in response_lower:
                # Create a more descriptive clue message
                return f"🔍 {self.name} mentioned '{keyword}'"
        
        return None
    
    async def _extract_auto_notes(self, user_question: str, response: str, state: GameState) -> list[AutoNote]:
        """
        Use LLM to extract relevant investigative notes from the conversation.
        
        The LLM analyzes the persona's response and extracts notes in these categories:
        - alibi: Where they claim to have been at specific times
        - motive: Potential motives or reasons for conflict
        - relationship: Information about relationships with victim/others
        - observation: What they saw, heard, or noticed
        - contradiction: Statements that contradict earlier info
        """
        extraction_prompt = f"""You are an investigator assistant. Analyze the following statement from {self.name} ({self.role}) and extract relevant investigation notes.

INVESTIGATOR'S QUESTION:
{user_question}

RESPONSE FROM {self.name.upper()}:
{response}

KNOWN FACTS ABOUT THE CASE:
- Victim: {state.get('victim', 'Unknown')}
- Timeline: {state.get('timeline', 'No information')}

TASK:
Extract ONLY relevant notes that could be important for the investigation. Ignore small talk and irrelevant statements.

Reply EXCLUSIVELY with a JSON array. If there is no relevant information, reply with [].

Each note must have the following format:
{{
  "text": "Short, concise note (max 100 characters)",
  "category": "alibi" | "motive" | "relationship" | "observation" | "contradiction"
}}

Categories:
- alibi: Information about location/time
- motive: Possible motives, conflicts, secrets
- relationship: Relationships to the victim or other people
- observation: What the person saw/heard
- contradiction: Contradictions to known facts

IMPORTANT: Extract only NEW, relevant information. Maximum 2-3 notes per response.

JSON Array:"""

        try:
            messages = [
                SystemMessage(content="You are a precise investigator assistant. Reply ONLY with valid JSON."),
                HumanMessage(content=extraction_prompt)
            ]
            
            extraction_response = await self.llm.ainvoke(messages)
            content = extraction_response.content.strip()
            
            # Clean up the response to ensure valid JSON
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            # Parse JSON
            raw_notes = json.loads(content)
            
            if not isinstance(raw_notes, list):
                return []
            
            # Convert to AutoNote format with timestamp
            timestamp = datetime.now().isoformat()
            notes = []
            
            for note in raw_notes[:3]:  # Max 3 notes per response
                if isinstance(note, dict) and "text" in note and "category" in note:
                    valid_categories = ["alibi", "motive", "relationship", "observation", "contradiction"]
                    category = note["category"] if note["category"] in valid_categories else "observation"
                    
                    notes.append(AutoNote(
                        text=note["text"][:150],  # Limit length
                        category=category,
                        timestamp=timestamp,
                        source_message=response[:100] + "..." if len(response) > 100 else response
                    ))
            
            logger.info(f"Extracted {len(notes)} auto-notes for {self.name}")
            return notes
            
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse auto-notes JSON: {e}")
            return []
        except Exception as e:
            logger.error(f"Error extracting auto-notes: {e}")
            return []
    
    async def invoke(self, state: GameState) -> GameState:
        """
        Main agent invocation - called by LangGraph.
        
        1. Reads shared knowledge from state
        2. Uses own private knowledge
        3. Generates response
        4. Updates state with response and dynamic changes
        5. Extracts auto-notes from the response
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
        
        # Detect if we revealed a clue (keyword-based, legacy)
        detected_clue = self._detect_revealed_clue(response_text)
        
        # Extract auto-notes from the response (LLM-based)
        new_auto_notes = await self._extract_auto_notes(
            user_question=state["user_message"],
            response=response_text,
            state=state
        )
        
        # Update agent's dynamic state
        agent_state = state["agent_states"].get(self.slug, {})
        agent_state["stress_level"] = min(1.0, agent_state.get("stress_level", 0) + 0.1)
        agent_state["interrogation_count"] = agent_state.get("interrogation_count", 0) + 1
        state["agent_states"][self.slug] = agent_state
        
        # Update revealed clues if we found one
        if detected_clue and detected_clue not in state.get("revealed_clues", []):
            state["revealed_clues"] = state.get("revealed_clues", []) + [detected_clue]
        
        # Update auto_notes for this persona
        if new_auto_notes:
            current_notes = state.get("auto_notes", {}).get(self.slug, [])
            state["auto_notes"][self.slug] = current_notes + new_auto_notes
        
        # Set response in state
        state["final_response"] = response_text
        state["responding_agent"] = self.slug
        state["detected_clue"] = detected_clue
        state["new_auto_notes"] = new_auto_notes  # Notes from this specific response
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
