import { useState } from 'react';

interface Persona {
    slug: string;
    name: string;
    role: string;
    description: string;
    emoji: string;
    image?: string;
}

interface AccuseModalProps {
    isOpen: boolean;
    onClose: () => void;
    personas: Persona[];
    onAccuse: (personaSlug: string) => void;
    isLoading: boolean;
    victimName: string;
}

export function AccuseModal({ 
    isOpen, 
    onClose, 
    personas, 
    onAccuse,
    isLoading,
    victimName
}: AccuseModalProps) {
    const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
    const [confirmStep, setConfirmStep] = useState(false);
    
    if (!isOpen) return null;
    
    const handleAccuse = () => {
        if (!selectedSlug) return;
        
        if (!confirmStep) {
            setConfirmStep(true);
            return;
        }
        
        onAccuse(selectedSlug);
    };
    
    const handleClose = () => {
        setSelectedSlug(null);
        setConfirmStep(false);
        onClose();
    };
    
    const selectedPersona = personas.find(p => p.slug === selectedSlug);
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={handleClose}
            />
            
            {/* Modal */}
            <div className="relative z-10 max-w-2xl w-full cia-bg-panel border border-red-500/50 shadow-lg shadow-red-500/20">
                {/* Top Bar */}
                <div className="bg-black/70 border-b border-red-500/30 px-4 py-2 flex items-center justify-between text-xs cia-text">
                    <div className="flex items-center gap-4">
                        <span className="cia-text-yellow">WARNING</span>
                        <span className="text-gray-400">ACCUSATION PROTOCOL</span>
                    </div>
                    <button 
                        onClick={handleClose}
                        className="text-white hover:text-gray-300 transition-colors text-xs cia-text uppercase"
                    >
                        CLOSE
                    </button>
                </div>
                
                <div className="p-6">
                    {!confirmStep ? (
                        <>
                            <div className="cia-document p-6 mb-6">
                                <div className="border-b-2 border-black pb-2 mb-4">
                                    <h2 className="text-lg font-bold uppercase cia-text">ACCUSATION PROTOCOL</h2>
                                </div>
                                <p className="text-sm mb-2">
                                    <span className="font-bold uppercase">OBJECTIVE:</span>
                                    <span className="ml-2">IDENTIFY THE PERPETRATOR OF THE MURDER OF {victimName}</span>
                                </p>
                                <p className="text-xs text-red-600 font-bold uppercase cia-text mt-4">
                                    ⚠ WARNING: THIS ACTION WILL TERMINATE THE INVESTIGATION ⚠
                                </p>
                            </div>
                            
                            <div className="mb-6">
                                <h3 className="text-xs text-white uppercase cia-text mb-3 tracking-wider">
                                    SELECT SUSPECT TO ACCUSE:
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {personas.map(persona => (
                                        <button
                                            key={persona.slug}
                                            onClick={() => setSelectedSlug(persona.slug)}
                                            className={`
                                                p-4 border transition-all text-left
                                                ${selectedSlug === persona.slug
                                                    ? 'cia-bg-dark border-red-500/50 shadow-lg shadow-red-500/20'
                                                    : 'cia-bg-dark border-white/10 hover:border-white/20'
                                                }
                                            `}
                                        >
                                            {persona.image ? (
                                                <div className="w-24 h-32 mx-auto mb-2 rounded overflow-hidden border-2 border-white/10">
                                                    <img 
                                                        src={persona.image} 
                                                        alt={persona.name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.style.display = 'none';
                                                            const parent = target.parentElement;
                                                            if (parent) {
                                                                parent.innerHTML = `<div class="text-2xl flex items-center justify-center w-full h-full">${persona.emoji}</div>`;
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="text-2xl mb-2 text-center">{persona.emoji}</div>
                                            )}
                                            <div className={`font-bold cia-text text-sm text-center ${
                                                selectedSlug === persona.slug ? 'cia-text-yellow' : 'text-white'
                                            }`}>
                                                {persona.name}
                                            </div>
                                            <div className="text-xs text-gray-400 cia-text text-center mt-1">
                                                {persona.role}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="cia-document p-6 text-center mb-6">
                            {selectedPersona?.image ? (
                                <div className="w-32 h-40 mx-auto mb-4 rounded overflow-hidden border-2 border-red-500/50">
                                    <img 
                                        src={selectedPersona.image} 
                                        alt={selectedPersona.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            const parent = target.parentElement;
                                            if (parent && selectedPersona) {
                                                parent.innerHTML = `<div class="text-5xl flex items-center justify-center w-full h-full">${selectedPersona.emoji}</div>`;
                                            }
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="text-5xl mb-4">{selectedPersona?.emoji}</div>
                            )}
                            <div className="border-b-2 border-black pb-2 mb-4">
                                <h2 className="text-lg font-bold uppercase cia-text">CONFIRM ACCUSATION</h2>
                            </div>
                            <p className="text-sm mb-2">
                                <span className="font-bold uppercase">YOU ARE ACCUSING:</span>
                            </p>
                            <p className="text-xl font-bold cia-text mb-4 cia-text-yellow">
                                {selectedPersona?.name.toUpperCase()}
                            </p>
                            <p className="text-xs text-red-600 font-bold uppercase cia-text">
                                THIS DECISION IS FINAL AND WILL TERMINATE THE INVESTIGATION
                            </p>
                        </div>
                    )}
                    
                    <div className="flex gap-3">
                        <button
                            onClick={confirmStep ? () => setConfirmStep(false) : handleClose}
                            className="flex-1 px-4 py-3 border border-white/10 text-white hover:bg-white/5 hover:border-white/20 transition-colors text-xs cia-text uppercase font-bold disabled:opacity-50"
                            disabled={isLoading}
                        >
                            {confirmStep ? 'BACK' : 'CANCEL'}
                        </button>
                        <button
                            onClick={handleAccuse}
                            disabled={!selectedSlug || isLoading}
                            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white text-xs cia-text uppercase font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? 'PROCESSING...' : confirmStep ? 'CONFIRM ACCUSATION' : 'PROCEED'}
                        </button>
                    </div>
                </div>
                
                {/* Bottom Status Bar */}
                <div className="bg-black/50 border-t border-red-500/30 px-4 py-2 flex items-center justify-between text-xs cia-text">
                    <div className="flex items-center gap-4">
                        <span className="text-gray-400">STATUS:</span>
                        <span className="cia-text-yellow">PENDING CONFIRMATION</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="cia-text-yellow cia-pulse">●</span>
                        <span className="text-gray-400">AWAITING INPUT</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
