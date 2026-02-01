/**
 * API Client
 * 
 * Zentralisierte API-Aufrufe für das Game.
 */

import axios from 'axios';
import type { 
    GameStartResponse, 
    ChatResponse, 
    AccuseResponse,
    Difficulty 
} from '@/types/game';

// Get CSRF token from meta tag
const getCsrfToken = (): string => {
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    return token || '';
};

const api = axios.create({
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRF-TOKEN': getCsrfToken(),
    },
    withCredentials: true,
});

// Update CSRF token on each request (in case it changes)
api.interceptors.request.use((config) => {
    config.headers['X-CSRF-TOKEN'] = getCsrfToken();
    return config;
});

// ============================================================================
// Game API
// ============================================================================

export async function generateAndStartGame(
    userInput: string, 
    difficulty: Difficulty
): Promise<GameStartResponse> {
    const response = await api.post<GameStartResponse>('/game/generate-and-start', {
        user_input: userInput,
        difficulty,
    });
    return response.data;
}

export async function quickStartGame(): Promise<GameStartResponse> {
    const response = await api.post<GameStartResponse>('/game/quick-start');
    return response.data;
}

export async function sendChatMessage(
    gameId: string,
    personaSlug: string,
    message: string
): Promise<ChatResponse> {
    const response = await api.post<ChatResponse>('/game/chat', {
        game_id: gameId,
        persona_slug: personaSlug,
        message,
    });
    return response.data;
}

export async function accusePersona(
    gameId: string,
    accusedPersona: string
): Promise<AccuseResponse> {
    const response = await api.post<AccuseResponse>('/game/accuse', {
        game_id: gameId,
        accused_persona: accusedPersona,
    });
    return response.data;
}

export interface HintResponse {
    hint: string;
    hints_used: number;
    clues_found: number;
    total_critical_clues: number;
}

export async function getHint(gameId: string): Promise<HintResponse> {
    const response = await api.post<HintResponse>('/game/hint', {
        game_id: gameId,
    });
    return response.data;
}

// ============================================================================
// Debug API
// ============================================================================

export async function getDebugPersonas() {
    const response = await axios.get('/api/debug/personas');
    return response.data;
}

export async function getDebugGraph() {
    const response = await axios.get('http://localhost:8001/debug/graph');
    return response.data;
}

export async function getDebugAgents() {
    const response = await axios.get('http://localhost:8001/debug/agents');
    return response.data;
}

export async function getDebugGameState(gameId: string) {
    const response = await axios.get(`http://localhost:8001/debug/game/${gameId}/state`);
    return response.data;
}
