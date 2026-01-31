import { Button } from '@/Components/ui/button';
import { Link } from '@inertiajs/react';
import { useState } from 'react';

interface GameHeaderProps {
    revealedClues: string[];
    onAccuse: () => void;
    scenarioName: string;
    caseNumber: string;
}

export function GameHeader({ revealedClues, onAccuse, scenarioName, caseNumber }: GameHeaderProps) {
    const [showClues, setShowClues] = useState(false);
    
    return (
        <header className="cia-bg-dark border-b border-white/10 sticky top-0 z-50 shadow-lg shadow-black/20">
            {/* Top Status Bar */}
            <div className="bg-black/70 border-b border-white/10 px-4 py-1 flex items-center justify-between text-xs cia-text">
                <div className="flex items-center gap-4">
                    <span className="text-white">CLASSIFIED</span>
                    <span className="text-gray-400">CASE FILE:</span>
                    <span className="cia-text-yellow">{caseNumber}</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-gray-400">STATUS:</span>
                    <span className="text-white cia-pulse">ACTIVE INVESTIGATION</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-gray-400">SECURITY:</span>
                    <span className="text-white">SEC 113</span>
                </div>
            </div>
            
            {/* Main Header */}
            <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/" className="text-white hover:text-gray-300 transition-colors text-xs cia-text uppercase">
                        HOME
                    </Link>
                    <div>
                        <h1 className="font-bold text-white uppercase tracking-wider cia-text text-sm">
                            {scenarioName}
                        </h1>
                        <p className="text-xs text-gray-400 cia-text">CASE: <span className="cia-monospace">{caseNumber}</span></p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {/* Debug button */}
                    <Link href="/debug">
                        <button className="px-3 py-1.5 border border-white/10 text-gray-300 hover:bg-white/5 hover:border-white/20 transition-colors text-xs cia-text uppercase">
                            DEBUG
                        </button>
                    </Link>
                    
                    {/* Clues button */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowClues(!showClues)}
                            className="px-3 py-1.5 border border-white/10 text-gray-300 hover:bg-white/5 hover:border-white/20 transition-colors text-xs cia-text uppercase flex items-center gap-2"
                        >
                            <span>EVIDENCE</span>
                            {revealedClues.length > 0 && (
                                <span className="bg-gray-800 text-white text-xs px-1.5 py-0.5 cia-text font-bold">
                                    {revealedClues.length}
                                </span>
                            )}
                        </button>
                        
                        {/* Clues dropdown */}
                        {showClues && (
                            <div className="absolute right-0 mt-2 w-80 cia-bg-panel border border-white/10 shadow-xl z-50">
                                <div className="bg-black/50 border-b border-white/10 px-3 py-2">
                                    <h3 className="font-semibold text-white text-xs uppercase cia-text">EVIDENCE LOG</h3>
                                </div>
                                <div className="p-3 max-h-64 overflow-y-auto cia-scrollbar">
                                    {revealedClues.length > 0 ? (
                                        <ul className="space-y-2">
                                            {revealedClues.map((clue, i) => (
                                                <li key={i} className="text-xs text-gray-300 cia-text flex items-start gap-2">
                                                    <span className="text-white mt-0.5">▶</span>
                                                    <span>{clue}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-gray-400 cia-text">
                                            NO EVIDENCE COLLECTED. INTERROGATE SUBJECTS.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Accuse button */}
                    <button 
                        onClick={onAccuse}
                        className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs cia-text uppercase transition-colors font-bold"
                    >
                        ACCUSE
                    </button>
                </div>
            </div>
            
            {/* Bottom Status Bar */}
            <div className="bg-black/50 border-t border-white/10 px-4 py-1 flex items-center justify-between text-xs cia-text">
                <div className="flex items-center gap-4">
                    <span className="text-gray-400">COMM SUBSYSTEM:</span>
                    <span className="text-white">ONLINE</span>
                </div>
                <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(ch => (
                        <div key={ch} className="flex items-center gap-1">
                            <span className="text-gray-500">CH {String(ch).padStart(2, '0')}</span>
                            <span className="w-1 h-3 bg-green-500"></span>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <span className="cia-text-yellow cia-pulse">●</span>
                    <span className="text-gray-400">SYSTEM OPERATIONAL</span>
                </div>
            </div>
        </header>
    );
}
