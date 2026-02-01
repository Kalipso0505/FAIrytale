/**
 * Clue Notification - Animated toast when a new clue is discovered
 */
import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClueNotificationProps {
    clue: string | null;
    onDismiss: () => void;
}

export function ClueNotification({ clue, onDismiss }: ClueNotificationProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        if (clue) {
            // Small delay before showing for smoother animation
            const showTimer = setTimeout(() => setIsVisible(true), 100);
            return () => clearTimeout(showTimer);
        } else {
            setIsVisible(false);
            setIsLeaving(false);
        }
    }, [clue]);

    const handleDismiss = () => {
        setIsLeaving(true);
        setTimeout(() => {
            onDismiss();
            setIsLeaving(false);
        }, 300);
    };

    if (!clue) return null;

    return (
        <div
            className={cn(
                "fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out",
                isVisible && !isLeaving
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 -translate-y-4"
            )}
        >
            <div className="relative group">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-green-500/30 blur-xl rounded-2xl animate-pulse" />
                
                {/* Main notification */}
                <div className="relative flex items-center gap-3 px-5 py-3 bg-zinc-900/95 border border-green-500/50 rounded-2xl shadow-2xl shadow-green-500/20 backdrop-blur-sm">
                    {/* Icon with pulse */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-green-500/50 rounded-full animate-ping" />
                        <div className="relative w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                            <Search className="w-5 h-5 text-green-400" />
                        </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">
                            Evidence Found!
                        </span>
                        <span className="text-sm text-zinc-200 max-w-xs truncate">
                            {clue}
                        </span>
                    </div>
                    
                    {/* Dismiss button */}
                    <button
                        onClick={handleDismiss}
                        className="ml-2 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-zinc-300"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
