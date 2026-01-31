import { useState } from 'react';
import { Target, AlertTriangle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/Components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Persona } from '@/types/game';

interface AccuseModalProps {
    isOpen: boolean;
    onClose: () => void;
    personas: Persona[];
    onAccuse: (personaSlug: string) => void;
    isLoading: boolean;
}

export function AccuseModal({
    isOpen,
    onClose,
    personas,
    onAccuse,
    isLoading,
}: AccuseModalProps) {
    const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
    const [confirmStep, setConfirmStep] = useState(false);

    const handleClose = () => {
        setSelectedSlug(null);
        setConfirmStep(false);
        onClose();
    };

    const handleSelect = (slug: string) => {
        setSelectedSlug(slug);
        setConfirmStep(false);
    };

    const handleProceed = () => {
        if (selectedSlug) {
            setConfirmStep(true);
        }
    };

    const handleConfirm = () => {
        if (selectedSlug) {
            onAccuse(selectedSlug);
        }
    };

    const selectedPersona = personas.find(p => p.slug === selectedSlug);

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                            <Target className="h-5 w-5 text-destructive" />
                        </div>
                        <div>
                            <DialogTitle>Make Your Accusation</DialogTitle>
                            <DialogDescription>
                                Choose the person you believe is the murderer.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {!confirmStep ? (
                    <>
                        {/* Suspect Selection */}
                        <div className="grid gap-2 py-4">
                            {personas.map((persona) => (
                                <button
                                    key={persona.slug}
                                    onClick={() => handleSelect(persona.slug)}
                                    className={cn(
                                        'flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                                        selectedSlug === persona.slug
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                    )}
                                >
                                    <Avatar className="h-10 w-10">
                                        {persona.image ? (
                                            <AvatarImage src={persona.image} alt={persona.name} />
                                        ) : null}
                                        <AvatarFallback className={cn(
                                            selectedSlug === persona.slug
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted'
                                        )}>
                                            {persona.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-foreground truncate">
                                            {persona.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {persona.role}
                                        </p>
                                    </div>
                                    {selectedSlug === persona.slug && (
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={handleClose} className="flex-1">
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleProceed} 
                                disabled={!selectedSlug}
                                className="flex-1"
                            >
                                Proceed
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Confirmation */}
                        <div className="py-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="h-8 w-8 text-destructive" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                Are you sure?
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                You are about to accuse:
                            </p>
                            {selectedPersona && (
                                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-muted">
                                    <Avatar className="h-8 w-8">
                                        {selectedPersona.image ? (
                                            <AvatarImage src={selectedPersona.image} alt={selectedPersona.name} />
                                        ) : null}
                                        <AvatarFallback className="bg-primary text-primary-foreground">
                                            {selectedPersona.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="font-semibold">{selectedPersona.name}</span>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-4">
                                This action cannot be undone. If your accusation is wrong, the game ends.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <Button 
                                variant="outline" 
                                onClick={() => setConfirmStep(false)} 
                                className="flex-1"
                                disabled={isLoading}
                            >
                                Go Back
                            </Button>
                            <Button 
                                variant="destructive"
                                onClick={handleConfirm}
                                disabled={isLoading}
                                className="flex-1"
                            >
                                {isLoading ? 'Processing...' : 'Confirm Accusation'}
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
