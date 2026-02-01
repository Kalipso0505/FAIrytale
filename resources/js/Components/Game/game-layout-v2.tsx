/**
 * Game Layout V2 - FBI Dossier Style (Full Page)
 * Vintage Papier-Ästhetik passend zur Intro-Seite
 * Schreibmaschinen-Font, vergilbtes Papier
 * KEINE separate Topbar - alles integriert
 */
import { GripVertical, Users, FileText, MessageCircle, MapPin, Clock, AlertTriangle, BookOpen, StickyNote, Pin, Save, Volume2, Target, RotateCcw, Lightbulb, Loader2 } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
import { useResize } from '@/hooks/use-resize';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { cn } from '@/lib/utils';
import type { Persona, Message, CaseInfo, ChatHistory, GameStatus } from '@/types/game';

interface GameLayoutProps {
    personas: Persona[];
    selectedPersona: Persona | null;
    messages: ChatHistory;
    caseInfo: CaseInfo;
    revealedClues: string[];
    notes: string;
    isLoading: boolean;
    pinnedMessages: Set<string>;
    savedMessages: Set<string>;
    gameId: string | null;
    status: GameStatus;
    hasNewClue?: boolean;
    isLoadingHint?: boolean;
    hintsUsed?: number;
    onSelectPersona: (persona: Persona) => void;
    onSendMessage: (message: string) => void;
    onNotesChange: (notes: string) => void;
    onPinMessage: (messageId: string) => void;
    onSaveToNotes: (messageId: string, content: string, personaName: string) => void;
    getUnreadCount: (slug: string) => number;
    onAccuse: () => void;
    onReset: () => void;
    onGetHint?: () => void;
}

export function GameLayoutV2({
    personas,
    selectedPersona,
    messages,
    caseInfo,
    revealedClues,
    notes,
    isLoading,
    pinnedMessages,
    savedMessages,
    gameId,
    status,
    hasNewClue = false,
    isLoadingHint = false,
    hintsUsed = 0,
    onSelectPersona,
    onSendMessage,
    onNotesChange,
    onPinMessage,
    onSaveToNotes,
    getUnreadCount,
    onAccuse,
    onReset,
    onGetHint,
}: GameLayoutProps) {
    const [resizeState, resizeActions] = useResize({
        minWidth: 220,
        maxWidth: 400,
        defaultLeftWidth: 280,
        defaultRightWidth: 320,
    });

    const [activeTab, setActiveTab] = useState<'case' | 'clues' | 'notes'>('case');
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [audioState, audioActions] = useAudioPlayer();

    const currentMessages = selectedPersona 
        ? (messages[selectedPersona.slug] || [])
        : [];

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentMessages]);

    const handleSend = () => {
        if (inputValue.trim() && !isLoading) {
            onSendMessage(inputValue.trim());
            setInputValue('');
        }
    };

    const getMessageId = (message: Message, index: number) => {
        return message.messageId || `${gameId}-${selectedPersona?.slug}-${index}`;
    };

    // Paper background style
    const paperBg = {
        background: 'linear-gradient(135deg, #f5f0e1 0%, #e8e0cc 50%, #f0e8d8 100%)',
    };

    return (
        <div className="h-screen flex bg-zinc-900 overflow-hidden p-3 gap-3">
            {/* Left Sidebar - Suspects (Paper Style) */}
            <div 
                className="shrink-0 rounded-lg overflow-hidden flex flex-col shadow-lg"
                style={{ ...paperBg, width: resizeState.leftWidth }}
            >
                {/* Case Title Header */}
                <div className="px-4 py-3 border-b-2 border-zinc-700 bg-red-900/10">
                    <div className="text-center">
                        <div className="text-[10px] font-mono text-red-700 uppercase tracking-widest mb-1">
                            Case File #{gameId?.slice(-8).toUpperCase()}
                        </div>
                        <h1 className="font-mono font-bold text-zinc-800 text-sm uppercase tracking-wide leading-tight">
                            {caseInfo.scenarioName}
                        </h1>
                        <div className="mt-2 inline-block px-2 py-0.5 bg-green-700 text-white text-[10px] font-mono uppercase tracking-wider rounded">
                            {status === 'active' ? 'Investigating' : status}
                        </div>
                    </div>
                </div>

                {/* Suspects Header */}
                <div className="px-4 py-2 border-b border-zinc-300">
                    <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 text-red-700" />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600">
                            Persons of Interest
                        </span>
                    </div>
                </div>

                {/* Persona List */}
                <div className="flex-1 overflow-y-auto">
                    {personas.map((persona, idx) => {
                        const isSelected = selectedPersona?.slug === persona.slug;
                        const unread = getUnreadCount(persona.slug);
                        
                        return (
                            <button
                                key={persona.slug}
                                onClick={() => onSelectPersona(persona)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-b border-zinc-300/50",
                                    isSelected 
                                        ? "bg-red-100/50 border-l-4 border-l-red-700" 
                                        : "hover:bg-amber-100/30"
                                )}
                            >
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs font-mono text-zinc-500">#{idx + 1}</span>
                                    <div className={cn(
                                        "w-10 h-10 rounded border-2 flex items-center justify-center text-lg font-bold",
                                        isSelected 
                                            ? "border-red-700 bg-red-50 text-red-700" 
                                            : "border-zinc-400 bg-zinc-100 text-zinc-600"
                                    )}>
                                        {persona.emoji || persona.name.charAt(0)}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={cn(
                                            "font-mono font-bold truncate text-sm uppercase",
                                            isSelected ? "text-red-800" : "text-zinc-700"
                                        )}>
                                            {persona.name}
                                        </span>
                                        {unread > 0 && (
                                            <span className="px-1.5 py-0.5 text-[10px] bg-red-700 text-white rounded font-bold font-mono">
                                                {unread}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-zinc-500 truncate font-mono">
                                        {persona.role}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Action Buttons */}
                <div className="p-3 border-t-2 border-zinc-400 space-y-2">
                    {/* Hint Button */}
                    {onGetHint && (
                        <button
                            onClick={onGetHint}
                            disabled={status !== 'active' || isLoadingHint}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-400 text-white font-mono text-xs uppercase tracking-wider rounded transition-colors"
                        >
                            {isLoadingHint ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Lightbulb className="w-4 h-4" />
                            )}
                            {isLoadingHint ? 'Thinking...' : `Get Hint ${hintsUsed > 0 ? `(${hintsUsed})` : ''}`}
                        </button>
                    )}
                    <button
                        onClick={onAccuse}
                        disabled={status !== 'active'}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-800 disabled:bg-zinc-400 text-white font-mono text-xs uppercase tracking-wider rounded transition-colors"
                    >
                        <Target className="w-4 h-4" />
                        Make Accusation
                    </button>
                    <button
                        onClick={onReset}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-zinc-400 hover:bg-zinc-200/50 text-zinc-600 font-mono text-[10px] uppercase tracking-wider rounded transition-colors"
                    >
                        <RotateCcw className="w-3 h-3" />
                        New Case
                    </button>
                </div>
            </div>

            {/* Left Resize Handle */}
            <div
                className={cn(
                    'w-2 flex items-center justify-center cursor-col-resize rounded hover:bg-zinc-700 transition-colors',
                    resizeState.isResizingLeft && 'bg-zinc-600'
                )}
                onMouseDown={resizeActions.startResizeLeft}
            >
                <GripVertical className="h-4 w-4 text-zinc-600" />
            </div>

            {/* Center - Chat (Paper Style - passend zum Rest) */}
            <div 
                className="flex-1 min-w-0 flex flex-col rounded-lg overflow-hidden shadow-lg border-2 border-zinc-400"
                style={paperBg}
            >
                {selectedPersona ? (
                    <>
                        {/* Chat Header - Interrogation Record */}
                        <div className="px-4 py-3 border-b-2 border-zinc-500 bg-red-900/10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded border-2 border-zinc-500 bg-white/50 flex items-center justify-center text-xl font-bold text-zinc-700">
                                    {selectedPersona.emoji || selectedPersona.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <div className="text-[10px] font-mono text-red-700 uppercase tracking-widest mb-0.5">
                                        Interrogation Record
                                    </div>
                                    <h2 className="font-mono font-bold text-zinc-800 uppercase tracking-wide">
                                        {selectedPersona.name}
                                    </h2>
                                    <p className="text-xs text-zinc-600 font-mono">{selectedPersona.role}</p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1.5 text-xs text-red-700 font-mono">
                                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                                        <span className="uppercase tracking-wider">Recording</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Messages - Paper Style */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {currentMessages.length === 0 ? (
                                <div className="h-full flex items-center justify-center">
                                    <div className="text-center font-mono">
                                        <MessageCircle className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
                                        <p className="text-sm text-zinc-600">
                                            SUBJECT: <span className="text-zinc-800 font-bold">{selectedPersona.name.toUpperCase()}</span>
                                        </p>
                                        <p className="text-xs text-zinc-500 mt-1">Begin questioning...</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {currentMessages.map((message, index) => {
                                        const messageId = getMessageId(message, index);
                                        const isPinned = pinnedMessages.has(messageId);
                                        const isSaved = savedMessages.has(messageId);
                                        const isPlaying = audioState.playingMessageId === messageId;

                                        return (
                                            <div
                                                key={messageId}
                                                className={cn(
                                                    "flex gap-3",
                                                    message.is_user ? "flex-row-reverse" : "flex-row"
                                                )}
                                            >
                                                {!message.is_user && (
                                                    <div className="w-8 h-8 rounded border-2 border-zinc-400 bg-white/70 flex items-center justify-center text-sm shrink-0 font-bold text-zinc-600">
                                                        {selectedPersona.emoji || selectedPersona.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div className={cn(
                                                    "max-w-[70%] group relative"
                                                )}>
                                                    <div className={cn(
                                                        "px-4 py-2.5 text-sm font-mono",
                                                        message.is_user 
                                                            ? "bg-blue-100/70 text-zinc-800 rounded-lg rounded-br-sm border-2 border-blue-300" 
                                                            : "bg-white/80 text-zinc-800 rounded-lg rounded-bl-sm border-2 border-zinc-400 shadow-sm",
                                                        isPinned && "ring-2 ring-yellow-500/50"
                                                    )}>
                                                        {message.is_user && (
                                                            <div className="text-[10px] text-blue-600 mb-1 uppercase font-bold">Investigator:</div>
                                                        )}
                                                        {!message.is_user && (
                                                            <div className="text-[10px] text-zinc-500 mb-1 uppercase font-bold">{selectedPersona.name}:</div>
                                                        )}
                                                        {message.content}
                                                    </div>
                                                    
                                                    {/* Message Actions */}
                                                    {!message.is_user && (
                                                        <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => onPinMessage(messageId)}
                                                                className={cn(
                                                                    "p-1 rounded hover:bg-amber-200/50",
                                                                    isPinned ? "text-yellow-600" : "text-zinc-500"
                                                                )}
                                                            >
                                                                <Pin className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={() => onSaveToNotes(messageId, message.content, selectedPersona.name)}
                                                                className={cn(
                                                                    "p-1 rounded hover:bg-amber-200/50",
                                                                    isSaved ? "text-green-600" : "text-zinc-500"
                                                                )}
                                                            >
                                                                <Save className="w-3 h-3" />
                                                            </button>
                                                            {message.audio_base64 && (
                                                                <button
                                                                    onClick={() => audioActions.toggle(messageId, message.audio_base64!)}
                                                                    className={cn(
                                                                        "p-1 rounded hover:bg-amber-200/50",
                                                                        isPlaying ? "text-red-600" : "text-zinc-500"
                                                                    )}
                                                                >
                                                                    <Volume2 className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Loading */}
                                    {isLoading && (
                                        <div className="flex gap-3">
                                            <div className="w-8 h-8 rounded border-2 border-zinc-400 bg-white/70 flex items-center justify-center text-sm shrink-0 font-bold text-zinc-600">
                                                {selectedPersona.emoji || selectedPersona.name.charAt(0)}
                                            </div>
                                            <div className="bg-white/80 border-2 border-zinc-400 rounded-lg rounded-bl-sm px-4 py-3 shadow-sm">
                                                <div className="flex gap-1">
                                                    <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                    <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                    <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        {/* Input - Paper Style */}
                        <div className="p-4 border-t-2 border-zinc-400 bg-amber-50/50">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                    placeholder={`Question ${selectedPersona.name}...`}
                                    disabled={isLoading}
                                    className="flex-1 bg-white/70 border-2 border-zinc-400 rounded px-4 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-500 font-mono focus:outline-none focus:border-zinc-600"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!inputValue.trim() || isLoading}
                                    className="px-5 py-2.5 bg-red-700 hover:bg-red-800 disabled:bg-zinc-300 disabled:text-zinc-500 text-white rounded transition-colors font-mono text-sm uppercase tracking-wider border-2 border-red-800 disabled:border-zinc-400"
                                >
                                    Submit
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center font-mono">
                            <div className="w-20 h-20 rounded border-2 border-zinc-400 bg-white/50 flex items-center justify-center mx-auto mb-4">
                                <Users className="w-10 h-10 text-zinc-400" />
                            </div>
                            <h3 className="text-lg font-bold text-zinc-700 mb-2 uppercase tracking-wide">Select Subject</h3>
                            <p className="text-sm text-zinc-500 max-w-xs">
                                Choose a person of interest from the list to begin interrogation
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Resize Handle */}
            <div
                className={cn(
                    'w-2 flex items-center justify-center cursor-col-resize rounded hover:bg-zinc-700 transition-colors',
                    resizeState.isResizingRight && 'bg-zinc-600'
                )}
                onMouseDown={resizeActions.startResizeRight}
            >
                <GripVertical className="h-4 w-4 text-zinc-600" />
            </div>

            {/* Right Sidebar - Case File (Paper Style) */}
            <div 
                className="shrink-0 rounded-lg overflow-hidden flex flex-col shadow-lg"
                style={{ ...paperBg, width: resizeState.rightWidth }}
            >
                {/* Header */}
                <div className="px-4 py-3 border-b-2 border-zinc-700">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-red-700" />
                        <span className="text-xs font-mono uppercase tracking-wider text-zinc-600">
                            Case File
                        </span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-zinc-400">
                    {(['case', 'clues', 'notes'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "flex-1 py-2 text-xs font-mono uppercase tracking-wider transition-colors",
                                activeTab === tab 
                                    ? "text-red-800 border-b-2 border-red-700 bg-red-50/50" 
                                    : "text-zinc-500 hover:text-zinc-700 hover:bg-amber-50/50"
                            )}
                        >
                            {tab}
                            {tab === 'clues' && revealedClues.length > 0 && (
                                <span className={cn(
                                    "ml-1 px-1.5 py-0.5 text-[10px] bg-green-600 text-white rounded font-bold transition-all",
                                    hasNewClue && "animate-pulse ring-2 ring-green-400 ring-offset-1 ring-offset-amber-50"
                                )}>
                                    {revealedClues.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {activeTab === 'case' && (
                        <div className="space-y-4 font-mono">
                            <div>
                                <h4 className="text-sm font-bold text-zinc-800 mb-1 uppercase">{caseInfo.scenarioName}</h4>
                                <p className="text-xs text-zinc-600">{caseInfo.setting}</p>
                            </div>

                            <div className="p-3 border-2 border-red-700 bg-red-50/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-4 h-4 text-red-700" />
                                    <span className="text-xs font-bold uppercase text-red-700">Victim</span>
                                </div>
                                <p className="font-bold text-zinc-800 uppercase">{caseInfo.victim.name}</p>
                                <p className="text-sm text-zinc-600">{caseInfo.victim.role}</p>
                                {caseInfo.victim.description && (
                                    <p className="text-xs text-zinc-500 mt-1">{caseInfo.victim.description}</p>
                                )}
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex gap-3">
                                    <MapPin className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[10px] uppercase text-zinc-500">Location</p>
                                        <p className="text-zinc-700">{caseInfo.location}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Clock className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[10px] uppercase text-zinc-500">Time of Incident</p>
                                        <p className="text-zinc-700">{caseInfo.timeOfIncident}</p>
                                    </div>
                                </div>
                            </div>

                            {caseInfo.timeline && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <BookOpen className="w-4 h-4 text-zinc-500" />
                                        <span className="text-[10px] uppercase text-zinc-500">Timeline</span>
                                    </div>
                                    <p className="text-xs text-zinc-600 whitespace-pre-line">{caseInfo.timeline}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'clues' && (
                        <div className="font-mono">
                            {revealedClues.length === 0 ? (
                                <div className="text-center py-8">
                                    <FileText className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
                                    <p className="text-sm text-zinc-600">No evidence collected</p>
                                    <p className="text-xs text-zinc-500 mt-1">Interview suspects to gather clues</p>
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {revealedClues.map((clue, index) => (
                                        <li key={index} className="flex gap-3 p-3 border border-green-700 bg-green-50/50">
                                            <span className="w-5 h-5 border border-green-700 flex items-center justify-center text-[10px] font-bold text-green-700 shrink-0">
                                                {index + 1}
                                            </span>
                                            <p className="text-sm text-zinc-700">{clue}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {activeTab === 'notes' && (
                        <div className="h-full flex flex-col font-mono">
                            <div className="flex items-center gap-2 mb-3">
                                <StickyNote className="w-4 h-4 text-zinc-500" />
                                <span className="text-[10px] uppercase text-zinc-500">Investigation Notes</span>
                            </div>
                            <textarea
                                value={notes}
                                onChange={(e) => onNotesChange(e.target.value)}
                                placeholder="Document your findings..."
                                className="flex-1 bg-white/50 border border-zinc-400 rounded p-3 text-sm text-zinc-700 placeholder:text-zinc-400 resize-none focus:outline-none focus:border-zinc-600"
                            />
                        </div>
                    )}
                </div>

                {/* Confidential Stamp */}
                <div className="px-4 py-2 border-t border-zinc-300 text-center">
                    <span className="text-[10px] font-mono text-red-700 uppercase tracking-widest">
                        ★ Confidential ★
                    </span>
                </div>
            </div>
        </div>
    );
}
