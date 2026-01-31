/**
 * Core Game Types
 * 
 * Zentrale Typdefinitionen für das Murder Mystery Game.
 * Alle Komponenten importieren von hier statt eigene Definitionen zu erstellen.
 */

// ============================================================================
// Persona Types
// ============================================================================

export interface Persona {
    slug: string;
    name: string;
    role: string;
    description: string;
    emoji: string;
    image?: string;
}

export interface PersonaDetailed extends Persona {
    personality: string;
    private_knowledge: string;
    shared_knowledge: string;
    knows_about_others: string;
    clue_keywords?: string[];
}

// ============================================================================
// Message Types
// ============================================================================

export interface Message {
    id?: number;
    persona_slug: string | null;
    content: string;
    is_user: boolean;
    created_at?: string;
    messageId?: string;
    audio_base64?: string;
    voice_id?: string;
}

export interface ChatHistory {
    [personaSlug: string]: Message[];
}

// ============================================================================
// Victim & Case Types
// ============================================================================

export interface Victim {
    name: string;
    role: string;
    description: string;
}

export interface CaseInfo {
    scenarioName: string;
    setting: string;
    victim: Victim;
    location: string;
    timeOfIncident: string;
    timeline: string;
    introMessage: string;
}

// ============================================================================
// Game State Types
// ============================================================================

export type GameStatus = 'not-started' | 'loading' | 'intro' | 'active' | 'solved' | 'failed';

export type Difficulty = 'einfach' | 'mittel' | 'schwer';

export interface GameState {
    gameId: string | null;
    status: GameStatus;
    scenarioName: string;
    setting: string;
    victim: Victim;
    location: string;
    timeOfIncident: string;
    timeline: string;
    personas: Persona[];
    introMessage: string;
    revealedClues: string[];
    messages: ChatHistory;
}

export interface GameSolution {
    correct: boolean;
    message: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface GameStartResponse {
    game_id: string;
    scenario_name: string;
    setting: string;
    victim: Victim;
    location: string;
    time_of_incident: string;
    timeline: string;
    personas: Persona[];
    intro_message: string;
}

export interface ChatResponse {
    persona_slug: string;
    persona_name: string;
    response: string;
    revealed_clue: string | null;
    audio_base64: string | null;
    voice_id: string | null;
}

export interface AccuseResponse {
    correct: boolean;
    message: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface ColumnWidths {
    left: number;
    right: number;
}

export interface ResizeState {
    isResizingLeft: boolean;
    isResizingRight: boolean;
}

// ============================================================================
// Debug Types
// ============================================================================

export interface AgentInfo {
    slug: string;
    name: string;
    role: string;
    clue_keywords: string[];
}

export interface GraphNode {
    id: string;
    label: string;
    type: string;
}

export interface GraphEdge {
    from: string;
    to: string;
    label: string;
}

export interface GraphData {
    mermaid: string;
    nodes: GraphNode[];
    edges: GraphEdge[];
}

export interface AgentsInfoResponse {
    agents: AgentInfo[];
    multi_agent_enabled: boolean;
    graph_nodes?: string[];
}
