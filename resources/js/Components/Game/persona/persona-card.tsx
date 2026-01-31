import { Avatar, AvatarFallback, AvatarImage } from '@/Components/ui/avatar';
import { Badge } from '@/Components/ui/badge';
import { cn } from '@/lib/utils';
import type { Persona } from '@/types/game';

interface PersonaCardProps {
    persona: Persona;
    isSelected?: boolean;
    unreadCount?: number;
    onClick?: () => void;
}

export function PersonaCard({
    persona,
    isSelected = false,
    unreadCount = 0,
    onClick,
}: PersonaCardProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full flex items-center gap-3 p-3 text-left transition-all',
                'border-b border-border hover:bg-muted/50',
                isSelected && 'bg-primary/5 border-l-2 border-l-primary'
            )}
        >
            {/* Avatar */}
            <Avatar className="h-12 w-12 shrink-0">
                {persona.image ? (
                    <AvatarImage src={persona.image} alt={persona.name} />
                ) : null}
                <AvatarFallback className={cn(
                    'text-lg',
                    isSelected 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                )}>
                    {persona.name.charAt(0)}
                </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={cn(
                        'font-medium truncate',
                        isSelected ? 'text-primary' : 'text-foreground'
                    )}>
                        {persona.name}
                    </span>
                    {unreadCount > 0 && (
                        <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs">
                            {unreadCount}
                        </Badge>
                    )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                    {persona.role}
                </p>
            </div>
        </button>
    );
}
