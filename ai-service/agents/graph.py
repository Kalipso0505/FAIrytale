"""
Murder Mystery LangGraph - The actual multi-agent graph.

This defines the flow of information between agents:
1. User message comes in
2. Router decides which persona should respond
3. Selected persona agent processes and responds
4. Response flows back to user

Future extensions:
- Group interrogation (all personas at once)
- GameMaster hints node
- Contradiction detection node
"""

import logging
from typing import Literal

from langgraph.graph import StateGraph, END

from .state import GameState
from .gamemaster_agent import GameMasterAgent

logger = logging.getLogger(__name__)


def create_murder_mystery_graph(gamemaster: GameMasterAgent):
    """
    Create the LangGraph for the murder mystery game.
    
    Graph structure:
    
        [START]
           │
           ▼
        [router] ──────────────────────────────┐
           │                                    │
           ├── persona=elena ──► [elena_agent] ─┤
           │                                    │
           ├── persona=tom ────► [tom_agent] ───┤
           │                                    │
           ├── persona=lisa ───► [lisa_agent] ──┤
           │                                    │
           └── persona=klaus ──► [klaus_agent] ─┤
                                                │
                                                ▼
                                              [END]
    """
    
    # Create the state graph with our GameState type
    graph = StateGraph(GameState)
    
    # === Add Nodes ===
    
    # Router node - decides which persona handles the message
    def router_node(state: GameState) -> GameState:
        """Route to the selected persona"""
        logger.info(f"Router: directing to {state['selected_persona']}")
        return state
    
    graph.add_node("router", router_node)
    
    # Add a node for each persona agent
    for slug, agent in gamemaster.persona_agents.items():
        # Create async wrapper for the agent
        async def make_agent_node(state: GameState, agent=agent):
            """Wrapper to invoke the persona agent"""
            logger.info(f"Invoking agent: {agent.name}")
            return await agent.invoke(state)
        
        graph.add_node(slug, make_agent_node)
        logger.info(f"Added node for agent: {slug}")
    
    # === Add Edges ===
    
    # Entry point is the router
    graph.set_entry_point("router")
    
    # Router conditionally routes to the selected persona
    def route_to_persona(state: GameState) -> str:
        """Determine which persona node to go to"""
        selected = state.get("selected_persona", "elena")
        
        # Validate the selection
        valid_personas = list(gamemaster.persona_agents.keys())
        if selected not in valid_personas:
            logger.warning(f"Invalid persona {selected}, defaulting to elena")
            return "elena"
        
        return selected
    
    # Add conditional edges from router to each persona
    persona_routes = {slug: slug for slug in gamemaster.persona_agents.keys()}
    
    graph.add_conditional_edges(
        "router",
        route_to_persona,
        persona_routes
    )
    
    # Each persona leads to END
    for slug in gamemaster.persona_agents.keys():
        graph.add_edge(slug, END)
    
    # Compile the graph
    compiled_graph = graph.compile()
    
    logger.info("Murder Mystery Graph compiled successfully")
    logger.info(f"Nodes: router, {', '.join(gamemaster.persona_agents.keys())}")
    
    return compiled_graph


def get_graph_visualization() -> dict:
    """
    Get a representation of the graph for visualization.
    
    Returns structure that can be rendered as Mermaid diagram.
    """
    return {
        "nodes": [
            {"id": "start", "label": "Start", "type": "start"},
            {"id": "router", "label": "Router", "type": "router"},
            {"id": "elena", "label": "Elena Schmidt\n(CEO)", "type": "persona"},
            {"id": "tom", "label": "Tom Berger\n(Developer)", "type": "persona"},
            {"id": "lisa", "label": "Lisa Hoffmann\n(Assistant)", "type": "persona"},
            {"id": "klaus", "label": "Klaus Müller\n(Facility)", "type": "persona"},
            {"id": "end", "label": "End", "type": "end"},
        ],
        "edges": [
            {"from": "start", "to": "router", "label": ""},
            {"from": "router", "to": "elena", "label": "persona=elena"},
            {"from": "router", "to": "tom", "label": "persona=tom"},
            {"from": "router", "to": "lisa", "label": "persona=lisa"},
            {"from": "router", "to": "klaus", "label": "persona=klaus"},
            {"from": "elena", "to": "end", "label": ""},
            {"from": "tom", "to": "end", "label": ""},
            {"from": "lisa", "to": "end", "label": ""},
            {"from": "klaus", "to": "end", "label": ""},
        ],
        "mermaid": """graph TD
    Start([Start]) --> Router{Router}
    Router -->|persona=elena| Elena[Elena Schmidt<br/>CEO]
    Router -->|persona=tom| Tom[Tom Berger<br/>Developer]
    Router -->|persona=lisa| Lisa[Lisa Hoffmann<br/>Assistant]
    Router -->|persona=klaus| Klaus[Klaus Müller<br/>Facility]
    Elena --> End([End])
    Tom --> End
    Lisa --> End
    Klaus --> End
    
    style Router fill:#f9d,stroke:#333
    style Elena fill:#9f9,stroke:#333
    style Tom fill:#9f9,stroke:#333
    style Lisa fill:#9f9,stroke:#333
    style Klaus fill:#9f9,stroke:#333"""
    }
