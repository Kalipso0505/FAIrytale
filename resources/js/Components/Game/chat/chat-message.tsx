import { Volume2, VolumeX, Pin, PinOff, Plus, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/Components/ui/avatar';
import { Button } from '@/Components/ui/button';
import { cn } from '@/lib/utils';
import type { Message, Persona } from '@/types/game';

interface ChatMessageProps {
    message: Message;
    persona: Persona;
    messageId: string;
    isPinned?: boolean;
    isSaved?: boolean;
    isPlaying?: boolean;
    onPin?: () => void;
    onSave?: () => void;
    onPlayAudio?: () => void;
}

export function ChatMessage({
    message,
    persona,
    messageId,
    isPinned = false,
    isSaved = false,
    isPlaying = false,
    onPin,
    onSave,
    onPlayAudio,
}: ChatMessageProps) {
    const isUser = message.is_user;
    const hasAudio = !!message.audio_base64;

    return (
        <div
            className={cn(
                'flex items-end gap-2 group animate-fade-in',
                isUser ? 'justify-end' : 'justify-start'
            )}
        >
            {/* Persona Avatar (left side for assistant) */}
            {!isUser && (
                <Avatar className="h-8 w-8 shrink-0">
                    {persona.image ? (
                        <AvatarImage src={persona.image} alt={persona.name} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {persona.name.charAt(0)}
                    </AvatarFallback>
                </Avatar>
            )}

            {/* Message Bubble */}
            <div
                className={cn(
                    'max-w-[75%] rounded-2xl px-4 py-2.5 relative',
                    isUser
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md',
                    isPinned && 'ring-2 ring-amber-400/50'
                )}
            >
                {/* Persona Name (only for assistant) */}
                {!isUser && (
                    <div className="text-xs font-semibold text-primary mb-1">
                        {persona.name}
                    </div>
                )}

                {/* Message Content */}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                </p>

                {/* Action Buttons (only for assistant messages) */}
                {!isUser && (
                    <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Play Audio Button */}
                        {hasAudio && onPlayAudio && (
                            <Button
                                size="icon"
                                variant="secondary"
                                className="h-6 w-6 rounded-full shadow-sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPlayAudio();
                                }}
                            >
                                {isPlaying ? (
                                    <VolumeX className="h-3 w-3" />
                                ) : (
                                    <Volume2 className="h-3 w-3" />
                                )}
                            </Button>
                        )}

                        {/* Pin Button */}
                        {onPin && (
                            <Button
                                size="icon"
                                variant={isPinned ? 'default' : 'secondary'}
                                className={cn(
                                    'h-6 w-6 rounded-full shadow-sm',
                                    isPinned && 'bg-amber-500 hover:bg-amber-600'
                                )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPin();
                                }}
                            >
                                {isPinned ? (
                                    <PinOff className="h-3 w-3" />
                                ) : (
                                    <Pin className="h-3 w-3" />
                                )}
                            </Button>
                        )}

                        {/* Save to Notes Button */}
                        {onSave && (
                            <Button
                                size="icon"
                                variant={isSaved ? 'default' : 'secondary'}
                                className={cn(
                                    'h-6 w-6 rounded-full shadow-sm',
                                    isSaved && 'bg-green-500 hover:bg-green-600'
                                )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSave();
                                }}
                                disabled={isSaved}
                            >
                                {isSaved ? (
                                    <Check className="h-3 w-3" />
                                ) : (
                                    <Plus className="h-3 w-3" />
                                )}
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* User Avatar (right side for user) */}
            {isUser && (
                <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                        I
                    </AvatarFallback>
                </Avatar>
            )}
        </div>
    );
}
