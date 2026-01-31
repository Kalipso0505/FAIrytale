import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { PersonaSelector } from '@/Components/Game/PersonaSelector';
import { ChatWindow } from '@/Components/Game/ChatWindow';
import { GameHeader } from '@/Components/Game/GameHeader';
import { AccuseModal } from '@/Components/Game/AccuseModal';
import { CaseInfoPanel } from '@/Components/Game/CaseInfoPanel';
import { StartScreen } from '@/Components/Game/StartScreen';
import axios from 'axios';

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
    messageId?: string; // Required for pinning/saving
}

interface GameState {
    gameId: string | null;
    status: 'not-started' | 'loading' | 'idle' | 'active' | 'solved' | 'failed';
    scenarioName: string;
    setting: string;
    victim: string;
    personas: Persona[];
    introMessage: string;
    revealedClues: string[];
    messages: Record<string, Message[]>; // Per persona
}

interface Props {
    // Empty - personas are now loaded dynamically per game
}

export default function Game({}: Props) {
    const [gameState, setGameState] = useState<GameState>({
        gameId: null,
        status: 'not-started',
        scenarioName: '',
        setting: '',
        victim: '',
        personas: [],
        introMessage: '',
        revealedClues: [],
        messages: {},
    });
    const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showAccuseModal, setShowAccuseModal] = useState(false);
    const [solution, setSolution] = useState<{
        correct: boolean;
        message: string;
    } | null>(null);
    
    // StartScreen state
    const [scenarioInput, setScenarioInput] = useState('');
    const [difficulty, setDifficulty] = useState<'einfach' | 'mittel' | 'schwer'>('mittel');
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Track read message count per persona (for unread badge)
    const [readCounts, setReadCounts] = useState<Record<string, number>>({});
    
    // Track pinned and saved messages
    const [pinnedMessages, setPinnedMessages] = useState<Set<string>>(() => {
        if (gameState.gameId) {
            const saved = localStorage.getItem(`pinned-messages-${gameState.gameId}`);
            return saved ? new Set(JSON.parse(saved)) : new Set();
        }
        return new Set();
    });
    
    const [savedMessages, setSavedMessages] = useState<Set<string>>(() => {
        if (gameState.gameId) {
            const saved = localStorage.getItem(`saved-messages-${gameState.gameId}`);
            return saved ? new Set(JSON.parse(saved)) : new Set();
        }
        return new Set();
    });
    
    // Load pinned/saved messages when game starts
    useEffect(() => {
        if (gameState.gameId) {
            const savedPinned = localStorage.getItem(`pinned-messages-${gameState.gameId}`);
            const savedSaved = localStorage.getItem(`saved-messages-${gameState.gameId}`);
            if (savedPinned) setPinnedMessages(new Set(JSON.parse(savedPinned)));
            if (savedSaved) setSavedMessages(new Set(JSON.parse(savedSaved)));
        } else {
            setPinnedMessages(new Set());
            setSavedMessages(new Set());
        }
    }, [gameState.gameId]);
    
    // Save pinned messages to localStorage
    useEffect(() => {
        if (gameState.gameId && pinnedMessages.size > 0) {
            localStorage.setItem(`pinned-messages-${gameState.gameId}`, JSON.stringify(Array.from(pinnedMessages)));
        }
    }, [pinnedMessages, gameState.gameId]);
    
    // Save saved messages to localStorage
    useEffect(() => {
        if (gameState.gameId && savedMessages.size > 0) {
            localStorage.setItem(`saved-messages-${gameState.gameId}`, JSON.stringify(Array.from(savedMessages)));
        }
    }, [savedMessages, gameState.gameId]);
    
    const handlePinMessage = (messageId: string, content: string, personaName: string) => {
        if (!gameState.gameId) return;
        
        setPinnedMessages(prev => {
            const newSet = new Set(prev);
            if (newSet.has(messageId)) {
                newSet.delete(messageId);
            } else {
                newSet.add(messageId);
            }
            // Save to localStorage immediately
            localStorage.setItem(`pinned-messages-${gameState.gameId}`, JSON.stringify(Array.from(newSet)));
            return newSet;
        });
    };
    
    const handleSaveToNotes = (messageId: string, content: string, personaName: string) => {
        setSavedMessages(prev => {
            const newSet = new Set(prev);
            if (!newSet.has(messageId)) {
                newSet.add(messageId);
                // Add to notes in CaseInfoPanel
                const notesKey = `case-notes-${gameState.gameId}`;
                const existingNotes = localStorage.getItem(notesKey) || '';
                const newNote = `\n\n[${personaName}]: ${content}`;
                localStorage.setItem(notesKey, existingNotes + newNote);
                // Trigger update in CaseInfoPanel by dispatching event
                window.dispatchEvent(new CustomEvent('notes-updated'));
            }
            return newSet;
        });
    };
    
    // Column widths with localStorage persistence
    const [leftWidth, setLeftWidth] = useState(() => {
        const saved = localStorage.getItem('column-width-left');
        return saved ? parseInt(saved) : 320; // Default 320px (w-80)
    });
    const [rightWidth, setRightWidth] = useState(() => {
        const saved = localStorage.getItem('column-width-right');
        return saved ? parseInt(saved) : 384; // Default 384px (w-96)
    });
    const [isResizingLeft, setIsResizingLeft] = useState(false);
    const [isResizingRight, setIsResizingRight] = useState(false);
    
    // Save widths to localStorage
    useEffect(() => {
        localStorage.setItem('column-width-left', leftWidth.toString());
    }, [leftWidth]);
    
    useEffect(() => {
        localStorage.setItem('column-width-right', rightWidth.toString());
    }, [rightWidth]);
    
    // Resize handlers
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isResizingLeft) {
                const container = document.querySelector('.max-w-\\[1920px\\]');
                if (container) {
                    const rect = container.getBoundingClientRect();
                    const newWidth = e.clientX - rect.left - 8; // Account for padding
                    if (newWidth >= 200 && newWidth <= 600) {
                        setLeftWidth(newWidth);
                    }
                }
            }
            if (isResizingRight) {
                const container = document.querySelector('.max-w-\\[1920px\\]');
                if (container) {
                    const rect = container.getBoundingClientRect();
                    const newWidth = rect.right - e.clientX - 8; // Account for padding
                    if (newWidth >= 200 && newWidth <= 600) {
                        setRightWidth(newWidth);
                    }
                }
            }
        };
        
        const handleMouseUp = () => {
            setIsResizingLeft(false);
            setIsResizingRight(false);
        };
        
        if (isResizingLeft || isResizingRight) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }
        
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizingLeft, isResizingRight]);

    const generateAndStartGame = async () => {
        setIsGenerating(true);
        try {
            const response = await axios.post('/game/generate-and-start', {
                user_input: scenarioInput,
                difficulty: difficulty,
            });
            
            const data = response.data;
            
            setGameState({
                gameId: data.game_id,
                status: 'active',
                scenarioName: data.scenario_name,
                setting: data.setting,
                victim: data.victim,
                personas: data.personas,
                introMessage: data.intro_message,
                revealedClues: [],
                messages: {},
            });
            // Reset read counts when starting new game
            setReadCounts({});
            // Reset pinned and saved messages for new game
            setPinnedMessages(new Set());
            setSavedMessages(new Set());
            // Reset selected persona
            setSelectedPersona(null);
        } catch (error: any) {
            console.error('Failed to generate scenario:', error);
            alert(error.response?.data?.error || 'Szenario-Generierung fehlgeschlagen. Bitte versuche es erneut.');
        } finally {
            setIsGenerating(false);
        }
    };

    const sendMessage = async (message: string) => {
        if (!gameState.gameId || !selectedPersona) return;

        const personaSlug = selectedPersona.slug;
        
        // Add user message to UI immediately
        const currentMessages = gameState.messages[personaSlug] || [];
        const messageId = `${gameState.gameId}-${personaSlug}-user-${currentMessages.length}-${Date.now()}`;
        const userMessage: Message = {
            persona_slug: null,
            content: message,
            is_user: true,
            messageId: messageId,
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
            const response = await axios.post('/game/chat', {
                game_id: gameState.gameId,
                persona_slug: personaSlug,
                message: message,
            });
            
            const data = response.data;
            
            // Add persona response
            const personaMessageId = `${gameState.gameId}-${personaSlug}-persona-${Date.now()}`;
            const personaMessage: Message = {
                persona_slug: data.persona_slug,
                content: data.response,
                is_user: false,
                messageId: personaMessageId,
            };
            
            setGameState(prev => {
                const currentMessages = prev.messages[personaSlug] || [];
                // Ensure messageId is set if not already set
                if (!personaMessage.messageId) {
                    personaMessage.messageId = `${gameState.gameId}-${personaSlug}-persona-${currentMessages.length}-${Date.now()}`;
                }
                const newMessages = [...currentMessages, personaMessage];
                // If this persona's chat is currently open, mark all messages as read
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
        } catch (error: any) {
            const errorMessageId = `${gameState.gameId}-${personaSlug}-error-${Date.now()}`;
            const errorMessage: Message = {
                persona_slug: personaSlug,
                content: error.response?.data?.error || 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.',
                is_user: false,
                messageId: errorMessageId,
            };
            
            setGameState(prev => {
                const currentMessages = prev.messages[personaSlug] || [];
                // Ensure messageId is set
                if (!errorMessage.messageId) {
                    errorMessage.messageId = `${gameState.gameId}-${personaSlug}-error-${currentMessages.length}-${Date.now()}`;
                }
                const newMessages = [...currentMessages, errorMessage];
                // If this persona's chat is currently open, mark all messages as read
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
                };
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePersonaSelect = (persona: Persona) => {
        setSelectedPersona(persona);
        // Mark all messages for this persona as read
        const messageCount = gameState.messages[persona.slug]?.length || 0;
        setReadCounts(prev => ({
            ...prev,
            [persona.slug]: messageCount,
        }));
    };

    const accusePersona = async (accusedSlug: string) => {
        if (!gameState.gameId) return;

        setIsLoading(true);
        try {
            const response = await axios.post('/game/accuse', {
                game_id: gameState.gameId,
                accused_persona: accusedSlug,
            });
            
            setSolution(response.data);
            setGameState(prev => ({
                ...prev,
                status: response.data.correct ? 'solved' : 'failed',
            }));
        } catch (error) {
            console.error('Failed to accuse:', error);
        } finally {
            setIsLoading(false);
            setShowAccuseModal(false);
        }
    };

    // Not started state - show start screen
    if (gameState.status === 'not-started') {
        return (
            <>
                <Head title="Murder Mystery - Start" />
                <StartScreen
                    scenarioInput={scenarioInput}
                    setScenarioInput={setScenarioInput}
                    difficulty={difficulty}
                    setDifficulty={setDifficulty}
                    isGenerating={isGenerating}
                    onStartGame={generateAndStartGame}
                />
            </>
        );
    }

    // Game ended - show solution
    if (solution) {
        return (
            <>
                <Head title={solution.correct ? 'CASE CLOSED' : 'INVESTIGATION FAILED'} />
                <div className="min-h-screen flex items-center justify-center p-6">
                    <div className={`max-w-3xl w-full cia-bg-panel border ${
                        solution.correct 
                            ? 'border-green-500/50 shadow-lg shadow-green-500/20' 
                            : 'border-red-500/50 shadow-lg shadow-red-500/20'
                    }`}>
                        {/* Top Bar */}
                        <div className="bg-black/50 border-b border-white/10 px-4 py-2 flex items-center justify-between text-xs cia-text">
                            <div className="flex items-center gap-4">
                                <span className="text-white">CASE FILE: {gameState.scenarioName || 'UNKNOWN'}</span>
                                <span className="text-gray-400">STATUS:</span>
                                <span className={solution.correct ? 'cia-text-yellow' : 'text-red-400'}>
                                    {solution.correct ? 'CLOSED' : 'FAILED'}
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-gray-400">RESULT:</span>
                                <span className={solution.correct ? 'text-green-400' : 'text-red-400'}>
                                    {solution.correct ? 'SUCCESS' : 'FAILURE'}
                                </span>
                            </div>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="text-center space-y-4 border-b border-white/10 pb-6">
                                <div className="text-6xl mb-2">{solution.correct ? '✓' : '✗'}</div>
                                <h1 className={`text-3xl font-bold uppercase tracking-wider cia-text ${
                                    solution.correct ? 'text-white' : 'text-red-400'
                                }`}>
                                    {solution.correct ? 'CASE CLOSED' : 'INVESTIGATION FAILED'}
                                </h1>
                            </div>
                            
                            <div className="cia-document p-6 space-y-4">
                                <div className="border-b-2 border-black pb-2 mb-4">
                                    <h2 className="text-xl font-bold uppercase">FINAL CASE REPORT</h2>
                                    <p className="text-xs text-gray-600">CASE #{gameState.gameId?.slice(0, 8).toUpperCase()}</p>
                                </div>
                                
                                <div className="space-y-3 text-sm">
                                    <p className="font-bold">{solution.message}</p>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => {
                                    setGameState({
                                        gameId: null,
                                        status: 'not-started',
                                        scenarioName: '',
                                        setting: '',
                                        victim: '',
                                        personas: [],
                                        introMessage: '',
                                        revealedClues: [],
                                        messages: {},
                                    });
                                    setSolution(null);
                                    setScenarioInput('');
                                    setDifficulty('mittel');
                                }}
                                className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 px-6 uppercase cia-text transition-all"
                            >
                                INITIATE NEW CASE
                            </button>
                        </div>
                        
                        {/* Bottom Status Bar */}
                        <div className="bg-black/50 border-t border-white/10 px-4 py-2 flex items-center justify-between text-xs cia-text">
                            <div className="flex items-center gap-4">
                                <span className="text-gray-400">SECURITY:</span>
                                <span className="text-white">SEC 113</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={solution.correct ? 'text-green-400' : 'text-red-400'}>●</span>
                                <span className="text-gray-400">CASE ARCHIVED</span>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // Active game
    return (
        <>
            <Head title="CLASSIFIED - ACTIVE INVESTIGATION" />
            <div className="h-screen flex flex-col overflow-hidden">
                <GameHeader 
                    revealedClues={gameState.revealedClues}
                    onAccuse={() => setShowAccuseModal(true)}
                />
                
                <div className="flex-1 flex gap-0 p-2 max-w-[1920px] mx-auto w-full min-h-0">
                    {/* Left Column: Chats (Kontakte) */}
                    <div 
                        className="shrink-0 h-full"
                        style={{ width: `${leftWidth}px`, minWidth: '200px', maxWidth: '600px' }}
                    >
                        <PersonaSelector 
                            personas={gameState.personas}
                            selectedPersona={selectedPersona}
                            onSelect={handlePersonaSelect}
                            messageCount={Object.fromEntries(
                                gameState.personas.map(p => {
                                    const totalMessages = gameState.messages[p.slug]?.length || 0;
                                    const readCount = readCounts[p.slug] || 0;
                                    const unreadCount = Math.max(0, totalMessages - readCount);
                                    return [p.slug, unreadCount];
                                })
                            )}
                        />
                    </div>
                    
                    {/* Resize Handle Left */}
                    <div
                        className={`w-2 bg-white/10 hover:bg-white/20 cursor-col-resize transition-colors group relative ${
                            isResizingLeft ? 'bg-white/30' : ''
                        }`}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            setIsResizingLeft(true);
                        }}
                        title="Ziehen zum Anpassen der Spaltenbreite"
                    >
                        <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-white/5"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 bg-white/20 group-hover:bg-white/30"></div>
                    </div>
                    
                    {/* Middle Column: Chat Window */}
                    <div className="flex-1 min-w-0">
                        {selectedPersona ? (
                            <ChatWindow 
                                persona={selectedPersona}
                                messages={gameState.messages[selectedPersona.slug] || []}
                                onSendMessage={sendMessage}
                                isLoading={isLoading}
                                introMessage={gameState.introMessage}
                                gameId={gameState.gameId}
                                pinnedMessages={pinnedMessages}
                                savedMessages={savedMessages}
                                onPinMessage={handlePinMessage}
                                onSaveToNotes={handleSaveToNotes}
                            />
                        ) : (
                            <div className="h-full cia-bg-panel border border-white/10 flex items-center justify-center">
                                <div className="text-center text-gray-400 cia-text">
                                    <div className="text-4xl mb-4">▶</div>
                                    <p className="uppercase tracking-wider">SELECT SUBJECT FOR INTERROGATION</p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Resize Handle Right */}
                    <div
                        className={`w-2 bg-white/10 hover:bg-white/20 cursor-col-resize transition-colors group relative ${
                            isResizingRight ? 'bg-white/30' : ''
                        }`}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            setIsResizingRight(true);
                        }}
                        title="Ziehen zum Anpassen der Spaltenbreite"
                    >
                        <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-white/5"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 bg-white/20 group-hover:bg-white/30"></div>
                    </div>
                    
                    {/* Right Column: Case Info Panel with Tabs */}
                    <div 
                        className="shrink-0 h-full"
                        style={{ width: `${rightWidth}px`, minWidth: '200px', maxWidth: '600px' }}
                    >
                        <CaseInfoPanel 
                            revealedClues={gameState.revealedClues}
                            gameId={gameState.gameId}
                            pinnedMessages={pinnedMessages}
                            messages={gameState.messages}
                            personas={gameState.personas}
                        />
                    </div>
                </div>
                
                {/* Accuse Modal */}
                <AccuseModal 
                    isOpen={showAccuseModal}
                    onClose={() => setShowAccuseModal(false)}
                    personas={gameState.personas}
                    onAccuse={accusePersona}
                    isLoading={isLoading}
                />
            </div>
        </>
    );
}
