import { useState, useRef, useCallback, useEffect } from 'react';

interface AudioPlayerState {
    playingMessageId: string | null;
    isPlaying: boolean;
}

interface AudioPlayerActions {
    play: (messageId: string, audioBase64: string) => void;
    stop: () => void;
    toggle: (messageId: string, audioBase64: string) => void;
}

/**
 * Hook for managing audio playback from base64 encoded audio
 */
export function useAudioPlayer(): [AudioPlayerState, AudioPlayerActions] {
    const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const urlRef = useRef<string | null>(null);

    // Cleanup function
    const cleanup = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        if (urlRef.current) {
            URL.revokeObjectURL(urlRef.current);
            urlRef.current = null;
        }
        setPlayingMessageId(null);
    }, []);

    // Stop playback
    const stop = useCallback(() => {
        cleanup();
    }, [cleanup]);

    // Play audio from base64
    const play = useCallback((messageId: string, audioBase64: string) => {
        // Stop any current playback
        cleanup();

        try {
            // Convert base64 to blob
            const binaryString = atob(audioBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(blob);
            urlRef.current = audioUrl;

            // Create and play audio
            const audio = new Audio(audioUrl);
            audioRef.current = audio;
            setPlayingMessageId(messageId);

            audio.onended = () => {
                cleanup();
            };

            audio.onerror = () => {
                console.error('Audio playback error');
                cleanup();
            };

            audio.play().catch(err => {
                console.error('Failed to play audio:', err);
                cleanup();
            });
        } catch (error) {
            console.error('Failed to decode audio:', error);
            cleanup();
        }
    }, [cleanup]);

    // Toggle playback
    const toggle = useCallback((messageId: string, audioBase64: string) => {
        if (playingMessageId === messageId) {
            stop();
        } else {
            play(messageId, audioBase64);
        }
    }, [playingMessageId, play, stop]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    return [
        { playingMessageId, isPlaying: playingMessageId !== null },
        { play, stop, toggle }
    ];
}
