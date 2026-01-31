import { useRef, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/Components/ui/avatar';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import type { Message, Persona } from '@/types/game';

interface ChatWindowProps {
    persona: Persona;
    messages: Message[];
    onSendMessage: (message: string) => void;
    isLoading: boolean;
    pinnedMessages: Set<string>;
    savedMessages: Set<string>;
    onPinMessage: (messageId: string) => void;
    onSaveToNotes: (messageId: string, content: string, personaName: string) => void;
    gameId: string | null;
}

export function ChatWindow({
    persona,
    messages,
    onSendMessage,
    isLoading,
    pinnedMessages,
    savedMessages,
    onPinMessage,
    onSaveToNotes,
    gameId,
}: ChatWindowProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [audioState, audioActions] = useAudioPlayer();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const getMessageId = (message: Message, index: number) => {
        return message.messageId || `${gameId}-${persona.slug}-${index}`;
    };

    return (
        <div className="h-full flex flex-col bg-card border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
                <Avatar className="h-10 w-10">
                    {persona.image ? (
                        <AvatarImage src={persona.image} alt={persona.name} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary">
                        {persona.name.charAt(0)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-foreground truncate">
                        {persona.name}
                    </h2>
                    <p className="text-xs text-muted-foreground truncate">
                        {persona.role}
                    </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Online</span>
                </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                            <MessageCircle className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Start your interrogation of{' '}
                            <span className="font-semibold text-foreground">{persona.name}</span>
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((message, index) => {
                            const messageId = getMessageId(message, index);
                            const isPinned = pinnedMessages.has(messageId);
                            const isSaved = savedMessages.has(messageId);
                            const isPlaying = audioState.playingMessageId === messageId;

                            return (
                                <ChatMessage
                                    key={messageId}
                                    message={message}
                                    persona={persona}
                                    messageId={messageId}
                                    isPinned={isPinned}
                                    isSaved={isSaved}
                                    isPlaying={isPlaying}
                                    onPin={() => onPinMessage(messageId)}
                                    onSave={() => onSaveToNotes(messageId, message.content, persona.name)}
                                    onPlayAudio={
                                        message.audio_base64
                                            ? () => audioActions.toggle(messageId, message.audio_base64!)
                                            : undefined
                                    }
                                />
                            );
                        })}

                        {/* Loading indicator */}
                        {isLoading && (
                            <div className="flex items-end gap-2">
                                <Avatar className="h-8 w-8 shrink-0">
                                    {persona.image ? (
                                        <AvatarImage src={persona.image} alt={persona.name} />
                                    ) : null}
                                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                        {persona.name.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                )}
            </ScrollArea>

            {/* Input */}
            <ChatInput
                onSend={onSendMessage}
                isLoading={isLoading}
                placeholder={`Message ${persona.name}...`}
            />
        </div>
    );
}
