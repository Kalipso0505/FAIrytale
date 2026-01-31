import { GripVertical } from 'lucide-react';
import { useResize } from '@/hooks/use-resize';
import { PersonaList } from './persona/persona-list';
import { ChatWindow } from './chat/chat-window';
import { CaseInfoPanel } from './case-info-panel';
import { cn } from '@/lib/utils';
import type { Persona, Message, CaseInfo, ChatHistory } from '@/types/game';

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
    onSelectPersona: (persona: Persona) => void;
    onSendMessage: (message: string) => void;
    onNotesChange: (notes: string) => void;
    onPinMessage: (messageId: string) => void;
    onSaveToNotes: (messageId: string, content: string, personaName: string) => void;
    getUnreadCount: (slug: string) => number;
}

export function GameLayout({
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
    onSelectPersona,
    onSendMessage,
    onNotesChange,
    onPinMessage,
    onSaveToNotes,
    getUnreadCount,
}: GameLayoutProps) {
    const [resizeState, resizeActions] = useResize({
        minWidth: 240,
        maxWidth: 480,
        defaultLeftWidth: 280,
        defaultRightWidth: 320,
    });

    const currentMessages = selectedPersona 
        ? (messages[selectedPersona.slug] || [])
        : [];

    return (
        <div 
            className="flex-1 flex overflow-hidden"
            data-resize-container
        >
            {/* Left Sidebar - Persona List */}
            <div 
                className="shrink-0 p-3 pr-0"
                style={{ width: resizeState.leftWidth }}
            >
                <PersonaList
                    personas={personas}
                    selectedPersona={selectedPersona}
                    onSelect={onSelectPersona}
                    getUnreadCount={getUnreadCount}
                />
            </div>

            {/* Left Resize Handle */}
            <div
                className={cn(
                    'w-3 flex items-center justify-center cursor-col-resize hover:bg-primary/5 transition-colors',
                    resizeState.isResizingLeft && 'bg-primary/10'
                )}
                onMouseDown={resizeActions.startResizeLeft}
            >
                <GripVertical className="h-4 w-4 text-border" />
            </div>

            {/* Center - Chat Window */}
            <div className="flex-1 min-w-0 p-3">
                {selectedPersona ? (
                    <ChatWindow
                        persona={selectedPersona}
                        messages={currentMessages}
                        onSendMessage={onSendMessage}
                        isLoading={isLoading}
                        pinnedMessages={pinnedMessages}
                        savedMessages={savedMessages}
                        onPinMessage={onPinMessage}
                        onSaveToNotes={onSaveToNotes}
                        gameId={gameId}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center bg-card border rounded-lg">
                        <div className="text-center px-6">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">👈</span>
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                Select a Suspect
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-xs">
                                Choose a person from the list to begin your interrogation
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Resize Handle */}
            <div
                className={cn(
                    'w-3 flex items-center justify-center cursor-col-resize hover:bg-primary/5 transition-colors',
                    resizeState.isResizingRight && 'bg-primary/10'
                )}
                onMouseDown={resizeActions.startResizeRight}
            >
                <GripVertical className="h-4 w-4 text-border" />
            </div>

            {/* Right Sidebar - Case Info */}
            <div 
                className="shrink-0 p-3 pl-0"
                style={{ width: resizeState.rightWidth }}
            >
                <CaseInfoPanel
                    caseInfo={caseInfo}
                    revealedClues={revealedClues}
                    notes={notes}
                    onNotesChange={onNotesChange}
                />
            </div>
        </div>
    );
}
