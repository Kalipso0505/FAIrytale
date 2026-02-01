/**
 * Hint Notification - Display hints from the GameMaster
 */
import { useEffect, useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HintNotificationProps {
    hint: string | null;
    onDismiss: () => void;
}

export function HintNotification({ hint, onDismiss }: HintNotificationProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        if (hint) {
            const showTimer = setTimeout(() => setIsVisible(true), 100);
            return () => clearTimeout(showTimer);
        } else {
            setIsVisible(false);
            setIsLeaving(false);
        }
    }, [hint]);

    const handleDismiss = () => {
        setIsLeaving(true);
        setTimeout(() => {
            onDismiss();
            setIsLeaving(false);
        }, 300);
    };

    if (!hint) return null;

    return (
        <div
            className={cn(
                "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out max-w-lg w-full px-4",
                isVisible && !isLeaving
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
            )}
        >
            <div className="relative group">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-2xl" />
                
                {/* Main notification */}
                <div className="relative flex items-start gap-4 px-5 py-4 bg-amber-950/95 border border-amber-500/50 rounded-2xl shadow-2xl shadow-amber-500/10 backdrop-blur-sm">
                    {/* Icon */}
                    <div className="relative shrink-0">
                        <div className="absolute inset-0 bg-amber-500/30 rounded-full animate-pulse" />
                        <div className="relative w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <Lightbulb className="w-5 h-5 text-amber-400" />
                        </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block mb-1">
                            💡 GameMaster's Hint
                        </span>
                        <p className="text-sm text-amber-100 leading-relaxed italic">
                            "{hint}"
                        </p>
                    </div>
                    
                    {/* Dismiss button */}
                    <button
                        onClick={handleDismiss}
                        className="shrink-0 p-1.5 rounded-lg hover:bg-amber-900/50 transition-colors text-amber-500 hover:text-amber-300"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
