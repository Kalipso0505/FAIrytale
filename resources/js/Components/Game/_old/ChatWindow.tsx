import { useState, useRef, useEffect } from 'react';

interface Persona {
    slug: string;
    name: string;
    role: string;
    description: string;
    emoji: string;
    image?: string;
}

interface Message {
    id?: number;
    persona_slug: string | null;
    content: string;
    is_user: boolean;
    created_at?: string;
    messageId?: string; // Unique ID for pinning/saving
    audio_base64?: string; // Generated audio from ElevenLabs
}

interface ChatWindowProps {
    persona: Persona;
    messages: Message[];
    onSendMessage: (message: string) => void;
    isLoading: boolean;
    introMessage?: string;
    gameId: string | null;
    pinnedMessages: Set<string>;
    savedMessages: Set<string>;
    onPinMessage: (messageId: string, content: string, personaName: string) => void;
    onSaveToNotes: (messageId: string, content: string, personaName: string) => void;
    onSaveToQuestions?: (content: string) => void;
}

export function ChatWindow({ 
    persona, 
    messages, 
    onSendMessage, 
    isLoading,
    introMessage,
    gameId,
    pinnedMessages,
    savedMessages,
    onPinMessage,
    onSaveToNotes,
    onSaveToQuestions
}: ChatWindowProps) {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [savedToQuestions, setSavedToQuestions] = useState<Set<string>>(new Set());

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        inputRef.current?.focus();
    }, [persona]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSendMessage(input.trim());
            setInput('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handlePlayAudio = (messageId: string, audioBase64: string) => {
        // Stop currently playing audio if any
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        // If clicking the same message, just stop
        if (playingMessageId === messageId) {
            setPlayingMessageId(null);
            return;
        }

        try {
            // Convert base64 to blob
            const binaryString = atob(audioBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(blob);

            // Create and play audio
            const audio = new Audio(audioUrl);
            audioRef.current = audio;
            setPlayingMessageId(messageId);

            audio.onended = () => {
                setPlayingMessageId(null);
                URL.revokeObjectURL(audioUrl);
                audioRef.current = null;
            };

            audio.onerror = () => {
                console.error('Audio playback error');
                setPlayingMessageId(null);
                URL.revokeObjectURL(audioUrl);
                audioRef.current = null;
            };

            audio.play().catch(err => {
                console.error('Failed to play audio:', err);
                setPlayingMessageId(null);
                URL.revokeObjectURL(audioUrl);
                audioRef.current = null;
            });
        } catch (error) {
            console.error('Failed to decode audio:', error);
            setPlayingMessageId(null);
        }
    };

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    return (
        <div className="h-full flex flex-col cia-bg-panel border border-white/10">
            {/* Header */}
            <div className="bg-black/50 border-b border-white/10 py-3 px-4">
                <div className="flex items-center gap-3">
                    {persona.image ? (
                        <div className="w-10 h-12 shrink-0 rounded overflow-hidden border border-white/10">
                            <img 
                                src={persona.image} 
                                alt={persona.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                        parent.innerHTML = `<div class="text-lg flex items-center justify-center w-full h-full">${persona.emoji}</div>`;
                                    }
                                }}
                            />
                        </div>
                    ) : (
                        <div className="text-xl">{persona.emoji}</div>
                    )}
                    <div>
                        <h2 className="font-semibold text-white cia-text">
                            {persona.name}
                        </h2>
                        <p className="text-xs text-gray-400 cia-text">{persona.role}</p>
                    </div>
                </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 cia-scrollbar">
                {/* Intro message */}
                {messages.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-sm text-gray-400 cia-text">
                            Beginne die Befragung von <span className="text-white font-semibold">{persona.name}</span>
                        </p>
                    </div>
                )}
                
                {messages.map((message, index) => {
                    // Use existing messageId - it should always be set when message is created
                    // Fallback: generate stable ID only if missing (shouldn't happen)
                    const messageId = message.messageId || (gameId ? `${gameId}-${persona.slug}-${index}-${message.content.substring(0, 30).replace(/\s/g, '').substring(0, 20)}` : `temp-${index}`);
                    const isPinned = pinnedMessages.has(messageId);
                    const isSaved = savedMessages.has(messageId);
                    
                    return (
                        <div 
                            key={messageId}
                            className={`flex ${message.is_user ? 'justify-end' : 'justify-start'} items-end gap-2 group`}
                        >
                            {!message.is_user && (
                                <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden border border-white/10">
                                    {persona.image ? (
                                        <img 
                                            src={persona.image} 
                                            alt={persona.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-lg">
                                            {persona.emoji}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className={`
                                max-w-[75%] rounded-lg px-4 py-2.5 relative group/message
                                ${message.is_user 
                                    ? 'bg-gray-800 text-white hover:bg-gray-700' 
                                    : 'cia-bg-dark border border-white/10 text-gray-200'
                                }
                                ${isPinned ? 'ring-2 ring-yellow-500/50' : ''}
                            `}>
                                {/* Save to Questions button - for user messages only */}
                                {message.is_user && onSaveToQuestions && (
                                    <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover/message:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSaveToQuestions(message.content);
                                                setSavedToQuestions(prev => new Set(prev).add(messageId));
                                                // Reset indicator after 2 seconds
                                                setTimeout(() => {
                                                    setSavedToQuestions(prev => {
                                                        const next = new Set(prev);
                                                        next.delete(messageId);
                                                        return next;
                                                    });
                                                }, 2000);
                                            }}
                                            className={`
                                                w-6 h-6 rounded flex items-center justify-center transition-colors
                                                ${savedToQuestions.has(messageId)
                                                    ? 'bg-green-500/30 text-green-300' 
                                                    : 'bg-black/30 border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                                                }
                                            `}
                                            title={savedToQuestions.has(messageId) ? 'Gespeichert!' : 'Zu Fragen hinzufügen'}
                                        >
                                            <span className="text-xs">{savedToQuestions.has(messageId) ? '✓' : '❓'}</span>
                                        </button>
                                    </div>
                                )}
                                
                                {/* Action buttons - visible on hover, top right - nur für Persona-Nachrichten */}
                                {!message.is_user && (
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/message:opacity-100 transition-opacity">
                                        {/* Play Audio Button - only show if audio is available */}
                                        {message.audio_base64 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePlayAudio(messageId, message.audio_base64!);
                                                }}
                                                className={`
                                                    w-6 h-6 rounded flex items-center justify-center transition-colors
                                                    ${playingMessageId === messageId
                                                        ? 'bg-green-500/30 text-green-300 hover:bg-green-500/40' 
                                                        : 'cia-bg-dark border border-white/10 text-gray-400 hover:text-green-400 hover:border-green-500/30'
                                                    }
                                                `}
                                                title={playingMessageId === messageId ? 'Läuft...' : 'Vorlesen'}
                                            >
                                                <span className="text-xs">{playingMessageId === messageId ? '⏸' : '🔊'}</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onPinMessage(messageId, message.content, persona.name);
                                            }}
                                            className={`
                                                w-6 h-6 rounded flex items-center justify-center transition-colors
                                                ${isPinned 
                                                    ? 'bg-yellow-500/30 text-yellow-300 hover:bg-yellow-500/40' 
                                                    : 'cia-bg-dark border border-white/10 text-gray-400 hover:text-yellow-400 hover:border-yellow-500/30'
                                                }
                                            `}
                                            title={isPinned ? 'Angepinnt' : 'Anpinnen'}
                                        >
                                            <span className="text-xs">{isPinned ? '📌' : '📌'}</span>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSaveToNotes(messageId, message.content, persona.name);
                                            }}
                                            className={`
                                                w-6 h-6 rounded flex items-center justify-center transition-colors
                                                ${isSaved 
                                                    ? 'bg-gray-700/50 text-white hover:bg-gray-700/70' 
                                                    : 'cia-bg-dark border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                                                }
                                            `}
                                            title={isSaved ? 'In Notizen gespeichert' : 'Zu Notizen hinzufügen'}
                                        >
                                            <span className="text-xs">{isSaved ? '✓' : '+'}</span>
                                        </button>
                                    </div>
                                )}
                                
                                                {!message.is_user && (
                                                    <div className="text-xs text-white font-semibold mb-1 pr-12">
                                                        {persona.name}
                                                    </div>
                                                )}
                                                <p className={`whitespace-pre-wrap cia-text ${message.is_user ? 'text-white' : 'text-gray-200'} text-sm leading-relaxed ${message.audio_base64 ? 'pr-10' : 'pr-8'}`}>
                                    {message.content}
                                </p>
                            </div>
                            {message.is_user && (
                                <div className="w-8 h-8 shrink-0 rounded-full bg-gray-800/50 border border-white/10 flex items-center justify-center">
                                    <span className="text-xs text-white font-bold">I</span>
                                </div>
                            )}
                        </div>
                    );
                })}
                
                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex justify-start items-end gap-2">
                        <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden border border-white/10">
                            {persona.image ? (
                                <img 
                                    src={persona.image} 
                                    alt={persona.name}
                                    className="w-full h-full object-cover opacity-50"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-lg opacity-50">
                                    {persona.emoji}
                                </div>
                            )}
                        </div>
                        <div className="cia-bg-dark border border-white/10 rounded-lg px-4 py-2.5">
                            <span className="text-xs cia-text text-gray-400">schreibt...</span>
                        </div>
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>
            
            {/* Input */}
            <form onSubmit={handleSubmit} className="border-t border-white/10 bg-black/30 p-3">
                <div className="flex gap-2">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Nachricht an ${persona.name}...`}
                        disabled={isLoading}
                        rows={1}
                        className="
                            flex-1 resize-none cia-bg-dark border border-white/10 
                            px-4 py-2.5 text-white placeholder-gray-500 cia-text text-sm rounded-lg
                            focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10
                            disabled:opacity-50
                        "
                    />
                    <button 
                        type="submit" 
                        disabled={!input.trim() || isLoading}
                        className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-semibold cia-text text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? '...' : 'SEND'}
                    </button>
                </div>
            </form>
        </div>
    );
}
