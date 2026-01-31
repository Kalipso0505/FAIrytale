import { Users } from 'lucide-react';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { PersonaCard } from './persona-card';
import type { Persona } from '@/types/game';

interface PersonaListProps {
    personas: Persona[];
    selectedPersona: Persona | null;
    onSelect: (persona: Persona) => void;
    getUnreadCount: (slug: string) => number;
}

export function PersonaList({
    personas,
    selectedPersona,
    onSelect,
    getUnreadCount,
}: PersonaListProps) {
    return (
        <div className="h-full flex flex-col bg-card border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                    Suspects
                </h3>
                <span className="text-xs text-muted-foreground">
                    ({personas.length})
                </span>
            </div>

            {/* List */}
            <ScrollArea className="flex-1">
                {personas.map((persona) => (
                    <PersonaCard
                        key={persona.slug}
                        persona={persona}
                        isSelected={selectedPersona?.slug === persona.slug}
                        unreadCount={getUnreadCount(persona.slug)}
                        onClick={() => onSelect(persona)}
                    />
                ))}
            </ScrollArea>
        </div>
    );
}
