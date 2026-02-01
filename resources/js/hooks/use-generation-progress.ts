import { useState, useCallback, useRef, useEffect } from 'react';
import { echoIsConfigured, echo } from '@laravel/echo-react';

/**
 * Progress stages matching backend events
 */
export type ProgressStage =
    | 'started'
    | 'generating_scenario'
    | 'scenario_complete'
    | 'generating_personas'
    | 'persona_complete'
    | 'generating_images'
    | 'initializing_game'
    | 'complete'
    | 'error';

/**
 * Progress event data from WebSocket
 */
export interface ProgressEvent {
    game_id: string;
    stage: ProgressStage;
    progress: number;
    message: string;
    persona_name?: string;
    persona_index?: number;
    total_personas?: number;
    timestamp: string;
}

/**
 * Generation progress state
 */
export interface GenerationProgress {
    stage: ProgressStage;
    progress: number;
    message: string;
    personaName?: string;
    personaIndex?: number;
    totalPersonas?: number;
    isActive: boolean;
    completedPersonas: string[];
}

const initialProgress: GenerationProgress = {
    stage: 'started',
    progress: 0,
    message: '',
    isActive: false,
    completedPersonas: [],
};

/**
 * Hook for subscribing to generation progress via WebSocket
 * Falls back gracefully when Echo is not configured
 */
export function useGenerationProgress(gameId: string | null) {
    const [progress, setProgress] = useState<GenerationProgress>(initialProgress);
    const completedPersonasRef = useRef<string[]>([]);
    const channelRef = useRef<ReturnType<ReturnType<typeof echo>['channel']> | null>(null);
    const currentGameIdRef = useRef<string | null>(null);
    
    // Subscribe to WebSocket channel when Echo is configured and we have a gameId
    useEffect(() => {
        // Skip if Echo isn't configured or no gameId
        if (!echoIsConfigured() || !gameId) {
            return;
        }
        
        // Skip if already subscribed to this channel
        if (currentGameIdRef.current === gameId && channelRef.current) {
            console.log(`Already subscribed to channel: game.${gameId}`);
            return;
        }
        
        const channelName = `game.${gameId}`;
        console.log(`Subscribing to channel: ${channelName}`);
        
        try {
            const echoInstance = echo();
            
            // Leave previous channel if any
            if (currentGameIdRef.current && currentGameIdRef.current !== gameId) {
                console.log(`Leaving previous channel: game.${currentGameIdRef.current}`);
                echoInstance.leave(`game.${currentGameIdRef.current}`);
            }
            
            currentGameIdRef.current = gameId;
            const channel = echoInstance.channel(channelName);
            channelRef.current = channel;
            
            // Listen for progress events
            channel.listen('.generation.progress', (event: ProgressEvent) => {
                console.log('Progress event received:', event);
                
                // Track completed personas
                if (event.stage === 'persona_complete' && event.persona_name) {
                    if (!completedPersonasRef.current.includes(event.persona_name)) {
                        completedPersonasRef.current = [...completedPersonasRef.current, event.persona_name];
                    }
                }
                
                setProgress({
                    stage: event.stage,
                    progress: event.progress,
                    message: event.message,
                    personaName: event.persona_name,
                    personaIndex: event.persona_index,
                    totalPersonas: event.total_personas,
                    isActive: event.stage !== 'complete' && event.stage !== 'error',
                    completedPersonas: completedPersonasRef.current,
                });
            });
            
            // Cleanup on unmount - only leave if this is really an unmount
            return () => {
                // Check if we're actually leaving (not just React StrictMode double-render)
                // We only leave if the gameId is still the same (real unmount)
                // If gameId changed, the next effect will handle leaving
                if (currentGameIdRef.current === gameId) {
                    console.log(`Leaving channel: ${channelName}`);
                    echoInstance.leave(channelName);
                    channelRef.current = null;
                    currentGameIdRef.current = null;
                }
            };
        } catch (e) {
            console.warn('Failed to subscribe to progress channel:', e);
        }
    }, [gameId]);
    
    // Reset progress and cleanup
    const resetProgress = useCallback(() => {
        completedPersonasRef.current = [];
        setProgress(initialProgress);
        
        // Leave channel on reset
        if (currentGameIdRef.current && echoIsConfigured()) {
            try {
                console.log(`Leaving channel on reset: game.${currentGameIdRef.current}`);
                echo().leave(`game.${currentGameIdRef.current}`);
                channelRef.current = null;
                currentGameIdRef.current = null;
            } catch (e) {
                console.warn('Failed to leave channel:', e);
            }
        }
    }, []);
    
    // Start tracking (call when generation starts)
    const startTracking = useCallback(() => {
        completedPersonasRef.current = [];
        setProgress({
            ...initialProgress,
            isActive: true,
            message: 'Verbindung wird hergestellt...',
        });
    }, []);
    
    return {
        ...progress,
        resetProgress,
        startTracking,
    };
}

export type UseGenerationProgressReturn = ReturnType<typeof useGenerationProgress>;
