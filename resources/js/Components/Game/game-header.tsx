import { Target, RotateCcw, Shield } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import type { GameStatus } from '@/types/game';

interface GameHeaderProps {
    scenarioName: string;
    status: GameStatus;
    onAccuse: () => void;
    onReset: () => void;
}

export function GameHeader({
    scenarioName,
    status,
    onAccuse,
    onReset,
}: GameHeaderProps) {
    const canAccuse = status === 'active';
    const isEnded = status === 'solved' || status === 'failed';

    return (
        <header className="header-bar">
            <div className="flex items-center justify-between h-14 px-4">
                {/* Left: Logo & Scenario */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Shield className="h-6 w-6 text-primary" />
                        <span className="font-bold text-lg tracking-tight hidden sm:inline">
                            FAIrytale
                        </span>
                    </div>
                    
                    {scenarioName && (
                        <>
                            <div className="h-6 w-px bg-border" />
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                                    {scenarioName}
                                </span>
                                {status === 'active' && (
                                    <Badge variant="secondary" className="text-xs">
                                        Investigating
                                    </Badge>
                                )}
                                {status === 'solved' && (
                                    <Badge variant="default" className="bg-green-600 text-xs">
                                        Solved
                                    </Badge>
                                )}
                                {status === 'failed' && (
                                    <Badge variant="destructive" className="text-xs">
                                        Failed
                                    </Badge>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {canAccuse && (
                        <Button
                            onClick={onAccuse}
                            variant="default"
                            size="sm"
                            className="gap-2"
                        >
                            <Target className="h-4 w-4" />
                            <span className="hidden sm:inline">Make Accusation</span>
                            <span className="sm:hidden">Accuse</span>
                        </Button>
                    )}

                    {isEnded && (
                        <Button
                            onClick={onReset}
                            variant="default"
                            size="sm"
                            className="gap-2"
                        >
                            <RotateCcw className="h-4 w-4" />
                            <span className="hidden sm:inline">New Game</span>
                            <span className="sm:hidden">New</span>
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}
