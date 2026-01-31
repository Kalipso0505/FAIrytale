import { useState, useCallback, useEffect } from 'react';
import type { 
    GameState, 
    GameStatus, 
    Persona, 
    Message, 
    Difficulty,
    GameSolution 
} from '@/types/game';
import * as api from '@/lib/api';
import { useLocalStorage, useLocalStorageSet } from './use-local-storage';

// Initial game state
const initialGameState: GameState = {
    gameId: null,
    status: 'not-started',
    scenarioName: '',
    setting: '',
    victim: { name: '', role: '', description: '' },
    location: '',
    timeOfIncident: '',
    timeline: '',
    personas: [],
    introMessage: '',
    revealedClues: [],
    messages: {},
};

/**
 * Central hook for managing game state
 */
export function useGameState() {
    const [gameState, setGameState] = useState<GameState>(initialGameState);
    const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [solution, setSolution] = useState<GameSolution | null>(null);
    
    // Start screen state
    const [scenarioInput, setScenarioInput] = useState('');
    const [difficulty, setDifficulty] = useState<Difficulty>('mittel');
    
    // Read counts for unread badges
    const [readCounts, setReadCounts] = useState<Record<string, number>>({});
    
    // Pinned and saved messages (per game)
    const gameStorageKey = gameState.gameId ? `game-${gameState.gameId}` : 'no-game';
    const [pinnedMessages, addPinned, removePinned, clearPinned] = useLocalStorageSet(`pinned-${gameStorageKey}`);
    const [savedMessages, addSaved, , clearSaved] = useLocalStorageSet(`saved-${gameStorageKey}`);
    
    // Notes per game
    const [notes, setNotes] = useLocalStorage(`notes-${gameStorageKey}`, '');

    // Reset pinned/saved when game changes
    useEffect(() => {
        if (!gameState.gameId) {
            clearPinned();
            clearSaved();
        }
    }, [gameState.gameId, clearPinned, clearSaved]);

    // Generate and start game
    const generateAndStart = useCallback(async () => {
        setIsGenerating(true);
        try {
            const data = await api.generateAndStartGame(scenarioInput, difficulty);
            
            setGameState({
                gameId: data.game_id,
                status: 'intro',
                scenarioName: data.scenario_name,
                setting: data.setting,
                victim: data.victim,
                location: data.location,
                timeOfIncident: data.time_of_incident,
                timeline: data.timeline,
                personas: data.personas,
                introMessage: data.intro_message,
                revealedClues: [],
                messages: {},
            });
            setReadCounts({});
            setSelectedPersona(null);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Szenario-Generierung fehlgeschlagen';
            console.error('Failed to generate scenario:', error);
            throw new Error(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    }, [scenarioInput, difficulty]);

    // Quick start with default scenario
    const quickStart = useCallback(async () => {
        setIsGenerating(true);
        try {
            const data = await api.quickStartGame();
            
            setGameState({
                gameId: data.game_id,
                status: 'intro',
                scenarioName: data.scenario_name,
                setting: data.setting,
                victim: data.victim,
                location: data.location,
                timeOfIncident: data.time_of_incident,
                timeline: data.timeline,
                personas: data.personas,
                introMessage: data.intro_message,
                revealedClues: [],
                messages: {},
            });
            setReadCounts({});
            setSelectedPersona(null);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Quick Start fehlgeschlagen';
            console.error('Failed to quick start:', error);
            throw new Error(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    }, []);

    // Begin investigation (transition from intro to active)
    const beginInvestigation = useCallback(() => {
        setGameState(prev => ({ ...prev, status: 'active' }));
    }, []);

    // Select a persona
    const selectPersona = useCallback((persona: Persona) => {
        setSelectedPersona(persona);
        // Mark all messages as read for this persona
        const messageCount = gameState.messages[persona.slug]?.length || 0;
        setReadCounts(prev => ({ ...prev, [persona.slug]: messageCount }));
    }, [gameState.messages]);

    // Send message to persona
    const sendMessage = useCallback(async (message: string) => {
        if (!gameState.gameId || !selectedPersona) return;

        const personaSlug = selectedPersona.slug;
        const messageId = `${gameState.gameId}-${personaSlug}-user-${Date.now()}`;
        
        // Add user message immediately
        const userMessage: Message = {
            persona_slug: null,
            content: message,
            is_user: true,
            messageId,
        };
        
        setGameState(prev => ({
            ...prev,
            messages: {
                ...prev.messages,
                [personaSlug]: [...(prev.messages[personaSlug] || []), userMessage],
            },
        }));

        setIsLoading(true);
        try {
            const data = await api.sendChatMessage(gameState.gameId, personaSlug, message);
            
            const personaMessageId = `${gameState.gameId}-${personaSlug}-persona-${Date.now()}`;
            const personaMessage: Message = {
                persona_slug: data.persona_slug,
                content: data.response,
                is_user: false,
                messageId: personaMessageId,
                audio_base64: data.audio_base64 || undefined,
                voice_id: data.voice_id || undefined,
            };
            
            setGameState(prev => {
                const currentMessages = prev.messages[personaSlug] || [];
                const newMessages = [...currentMessages, personaMessage];
                
                // Update read count if this persona is selected
                if (selectedPersona?.slug === personaSlug) {
                    setReadCounts(prevCounts => ({
                        ...prevCounts,
                        [personaSlug]: newMessages.length,
                    }));
                }
                
                return {
                    ...prev,
                    messages: {
                        ...prev.messages,
                        [personaSlug]: newMessages,
                    },
                    revealedClues: data.revealed_clue 
                        ? [...prev.revealedClues, data.revealed_clue]
                        : prev.revealedClues,
                };
            });
        } catch (error: unknown) {
            const errorContent = error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten';
            const errorMessage: Message = {
                persona_slug: personaSlug,
                content: errorContent,
                is_user: false,
                messageId: `${gameState.gameId}-${personaSlug}-error-${Date.now()}`,
            };
            
            setGameState(prev => ({
                ...prev,
                messages: {
                    ...prev.messages,
                    [personaSlug]: [...(prev.messages[personaSlug] || []), errorMessage],
                },
            }));
        } finally {
            setIsLoading(false);
        }
    }, [gameState.gameId, selectedPersona]);

    // Accuse a persona
    const accuse = useCallback(async (accusedSlug: string) => {
        if (!gameState.gameId) return;

        setIsLoading(true);
        try {
            const result = await api.accusePersona(gameState.gameId, accusedSlug);
            setSolution(result);
            setGameState(prev => ({
                ...prev,
                status: result.correct ? 'solved' : 'failed',
            }));
        } catch (error) {
            console.error('Failed to accuse:', error);
        } finally {
            setIsLoading(false);
        }
    }, [gameState.gameId]);

    // Reset game
    const reset = useCallback(() => {
        setGameState(initialGameState);
        setSolution(null);
        setScenarioInput('');
        setDifficulty('mittel');
        setSelectedPersona(null);
        setReadCounts({});
    }, []);

    // Toggle pin message
    const togglePin = useCallback((messageId: string) => {
        if (pinnedMessages.has(messageId)) {
            removePinned(messageId);
        } else {
            addPinned(messageId);
        }
    }, [pinnedMessages, addPinned, removePinned]);

    // Save message to notes
    const saveToNotes = useCallback((messageId: string, content: string, personaName: string) => {
        if (!savedMessages.has(messageId)) {
            addSaved(messageId);
            const newNote = `\n\n[${personaName}]: ${content}`;
            setNotes(prev => prev + newNote);
        }
    }, [savedMessages, addSaved, setNotes]);

    // Calculate unread counts
    const getUnreadCount = useCallback((personaSlug: string) => {
        const totalMessages = gameState.messages[personaSlug]?.length || 0;
        const readCount = readCounts[personaSlug] || 0;
        return Math.max(0, totalMessages - readCount);
    }, [gameState.messages, readCounts]);

    return {
        // State
        ...gameState,
        selectedPersona,
        isLoading,
        isGenerating,
        solution,
        scenarioInput,
        difficulty,
        pinnedMessages,
        savedMessages,
        notes,
        
        // Actions
        setScenarioInput,
        setDifficulty,
        generateAndStart,
        quickStart,
        beginInvestigation,
        selectPersona,
        sendMessage,
        accuse,
        reset,
        togglePin,
        saveToNotes,
        setNotes,
        getUnreadCount,
    };
}

export type UseGameStateReturn = ReturnType<typeof useGameState>;
