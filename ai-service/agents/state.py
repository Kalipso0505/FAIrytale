"""
GameState - The shared state that flows through all agents in the graph.

This defines what information is available to each agent:
- Shared knowledge: accessible by ALL agents
- Private knowledge: stored in agent's own data (not in state)
- Dynamic state: changes during gameplay (stress, lies, etc.)
"""

from typing import TypedDict, Annotated, Optional
from operator import add


class AgentState(TypedDict):
    """Dynamic state for each individual agent"""
    stress_level: float  # 0.0 - 1.0, increases with interrogation
    lies_told: int  # Number of lies told
    interrogation_count: int  # How many times questioned
    last_topics: list[str]  # What was discussed recently


class Message(TypedDict):
    """A single message in the conversation"""
    role: str  # "user" or "assistant"
    persona_slug: Optional[str]  # Which persona sent this (None for user)
    content: str


class GameState(TypedDict):
    """
    The complete game state that flows through the LangGraph.
    
    SHARED KNOWLEDGE (all agents see this):
    - scenario_name, setting, victim, timeline, shared_facts
    
    DYNAMIC STATE (changes during game):
    - agent_states: per-agent stress, lies, etc.
    - messages: full chat history
    - revealed_clues: what the user has discovered
    
    CURRENT REQUEST:
    - user_message: what the user just asked
    - selected_persona: who should respond
    
    RESPONSE:
    - final_response: the generated answer
    - responding_agent: who answered
    
    VOICE (ElevenLabs):
    - voice_assignments: mapping of persona slugs to voice IDs
    - audio_base64: generated audio for current response
    """
    
    # === Game Identification ===
    game_id: str
    
    # === Shared Knowledge (all agents see this) ===
    scenario_name: str
    setting: str
    victim: str
    timeline: str
    shared_facts: str
    
    # === Personas Info (public info about all characters) ===
    personas_public_info: dict[str, dict]  # slug -> {name, role, public_description}
    
    # === Voice Assignments (ElevenLabs) ===
    voice_assignments: dict[str, str]  # slug -> voice_id
    
    # === Current Request ===
    user_message: str
    selected_persona: str  # Which persona should respond
    
    # === Message History ===
    messages: Annotated[list[Message], add]  # Accumulates with each turn
    
    # === Dynamic Agent States ===
    agent_states: dict[str, AgentState]  # Per-agent dynamic state
    
    # === Game Progress ===
    revealed_clues: list[str]  # Clues discovered during play
    game_status: str  # "active", "solved", "failed"
    
    # === Response (filled by responding agent) ===
    final_response: str
    responding_agent: str
    detected_clue: Optional[str]  # If this response reveals a clue
    audio_base64: Optional[str]  # Generated audio for the response
    voice_id: Optional[str]  # Voice ID used for audio generation


def create_initial_agent_state() -> AgentState:
    """Create a fresh agent state"""
    return AgentState(
        stress_level=0.0,
        lies_told=0,
        interrogation_count=0,
        last_topics=[]
    )


def create_initial_game_state(
    game_id: str,
    scenario: dict,
    voice_assignments: Optional[dict[str, str]] = None,
    user_message: str = "",
    selected_persona: str = ""
) -> GameState:
    """
    Create the initial game state from a scenario.
    
    This sets up all shared knowledge that every agent can access.
    """
    # Extract public persona info (what everyone knows)
    personas_public = {
        p["slug"]: {
            "name": p["name"],
            "role": p["role"],
            "public_description": p["public_description"]
        }
        for p in scenario["personas"]
    }
    
    # Initialize agent states
    agent_states = {
        p["slug"]: create_initial_agent_state()
        for p in scenario["personas"]
    }
    
    return GameState(
        game_id=game_id,
        scenario_name=scenario["name"],
        setting=scenario["setting"],
        victim=f"{scenario['victim']['name']} ({scenario['victim']['role']})",
        timeline=scenario["timeline"],
        shared_facts=scenario["shared_knowledge"],
        personas_public_info=personas_public,
        voice_assignments=voice_assignments or {},
        user_message=user_message,
        selected_persona=selected_persona,
        messages=[],
        agent_states=agent_states,
        revealed_clues=[],
        game_status="active",
        final_response="",
        responding_agent="",
        detected_clue=None,
        audio_base64=None,
        voice_id=None
    )
