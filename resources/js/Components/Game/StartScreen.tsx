import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Loader2 } from 'lucide-react';

interface StartScreenProps {
    scenarioInput: string;
    setScenarioInput: (value: string) => void;
    difficulty: 'einfach' | 'mittel' | 'schwer';
    setDifficulty: (value: 'einfach' | 'mittel' | 'schwer') => void;
    isGenerating: boolean;
    onStartGame: () => void;
}

export function StartScreen({
    scenarioInput,
    setScenarioInput,
    difficulty,
    setDifficulty,
    isGenerating,
    onStartGame,
}: StartScreenProps) {
    const difficulties: Array<{ value: 'einfach' | 'mittel' | 'schwer'; label: string; description: string }> = [
        { value: 'einfach', label: 'Einfach', description: 'Klare Hinweise, Mörder gibt schnell nach' },
        { value: 'mittel', label: 'Mittel', description: 'Gemischte Hinweise, Mörder macht Fehler' },
        { value: 'schwer', label: 'Schwer', description: 'Versteckte Hinweise, perfekter Lügner' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl bg-slate-800/90 border-red-900/50 shadow-2xl">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                        Erstelle dein Murder Mystery
                    </CardTitle>
                    <p className="text-center text-slate-300 mt-2">
                        Beschreibe dein Wunsch-Szenario oder lass uns eine Überraschung erstellen
                    </p>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Scenario Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Szenario-Vorschlag (optional)
                        </label>
                        <textarea
                            value={scenarioInput}
                            onChange={(e) => setScenarioInput(e.target.value)}
                            placeholder="z.B. 'Ein Mord auf einem Kreuzfahrtschiff in den 1920er Jahren' oder lass das Feld leer für eine Überraschung..."
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none h-24"
                            maxLength={500}
                            disabled={isGenerating}
                        />
                        <div className="text-right text-xs text-slate-400 mt-1">
                            {scenarioInput.length}/500 Zeichen
                        </div>
                    </div>

                    {/* Difficulty Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-3">
                            Schwierigkeitsgrad
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {difficulties.map((diff) => (
                                <button
                                    key={diff.value}
                                    onClick={() => setDifficulty(diff.value)}
                                    disabled={isGenerating}
                                    className={`
                                        p-4 rounded-lg border-2 transition-all
                                        ${difficulty === diff.value
                                            ? 'bg-red-600/30 border-red-500 shadow-lg shadow-red-500/20'
                                            : 'bg-slate-700/30 border-slate-600 hover:border-red-600/50'
                                        }
                                        ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                    `}
                                >
                                    <div className="text-center">
                                        <div className={`font-bold text-lg mb-1 ${
                                            difficulty === diff.value ? 'text-red-400' : 'text-slate-200'
                                        }`}>
                                            {diff.label}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {diff.description}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Loading State */}
                    {isGenerating && (
                        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                            <div className="flex items-center justify-center gap-3">
                                <Loader2 className="w-6 h-6 text-red-400 animate-spin" />
                                <div className="text-center">
                                    <div className="text-red-400 font-semibold">
                                        Dein Szenario wird generiert...
                                    </div>
                                    <div className="text-slate-400 text-sm mt-1">
                                        Dies kann 60-120 Sekunden dauern
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Start Button */}
                    <Button
                        onClick={onStartGame}
                        disabled={isGenerating}
                        className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-6 text-lg shadow-lg shadow-red-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Wird generiert...
                            </>
                        ) : (
                            'Start Game'
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
