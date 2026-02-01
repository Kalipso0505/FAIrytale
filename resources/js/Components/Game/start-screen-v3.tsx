/**
 * Start Screen - Murder Mystery Theme
 * Gruseliges, atmosphärisches Design mit Rot-Akzenten
 * Custom Scenario immer sichtbar
 */
import { useState } from 'react';
import { Sparkles, Zap, ArrowRight, Loader2, Skull } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Textarea } from '@/Components/ui/textarea';
import { Badge } from '@/Components/ui/badge';
import { cn } from '@/lib/utils';
import type { Difficulty } from '@/types/game';
import type { GenerationProgress } from '@/hooks/use-generation-progress';
import { GenerationProgressDisplay } from './generation-progress';

interface StartScreenProps {
    scenarioInput: string;
    onScenarioInputChange: (value: string) => void;
    difficulty: Difficulty;
    onDifficultyChange: (value: Difficulty) => void;
    onGenerate: () => void;
    onQuickStart: () => void;
    isGenerating: boolean;
    generationProgress?: GenerationProgress;
}

const difficulties: { value: Difficulty; label: string; description: string }[] = [
    { value: 'einfach', label: 'Casual', description: 'Guided clues' },
    { value: 'mittel', label: 'Detective', description: 'Balanced' },
    { value: 'schwer', label: 'Nightmare', description: 'No mercy' },
];

const exampleScenarios = [
    'A haunted Victorian mansion during a séance',
    'An abandoned asylum on Halloween night',
    'A luxury yacht stranded in a storm',
    'A remote cabin in the woods',
];

export function StartScreenV3({
    scenarioInput,
    onScenarioInputChange,
    difficulty,
    onDifficultyChange,
    onGenerate,
    onQuickStart,
    isGenerating,
    generationProgress,
}: StartScreenProps) {
    const [showExamples, setShowExamples] = useState(false);
    const canGenerate = scenarioInput.trim().length > 0 && !isGenerating;
    
    // Show progress display when generating and progress is available
    const showProgress = isGenerating && generationProgress?.isActive;

    return (
        <div className="h-screen bg-zinc-950 text-white overflow-hidden">
            <div className="h-full flex flex-col lg:flex-row">
                {/* Content Section - Left */}
                <div className="w-full lg:w-1/2 h-full flex flex-col justify-center px-6 py-8 lg:px-12 xl:px-20 relative z-10 overflow-hidden">
                    {/* Blood splatter decorative elements */}
                    <div className="absolute top-0 left-0 w-96 h-96 bg-red-900/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-red-800/15 rounded-full blur-3xl translate-y-1/2" />
                    
                    {/* Show progress when generating */}
                    {showProgress && generationProgress ? (
                        <div className="relative">
                            <GenerationProgressDisplay progress={generationProgress} />
                        </div>
                    ) : (
                    <div className="relative space-y-5 max-w-lg">
                        {/* Title */}
                        <div className="space-y-3">
                            <h1 className="text-5xl lg:text-6xl font-black tracking-tight">
                                <span className="text-white">F</span>
                                <span className="text-red-500">AI</span>
                                <span className="text-white">rytales</span>
                            </h1>
                            <p className="text-lg text-zinc-400 font-light max-w-md">
                                Immersive murder mysteries powered by AI. 
                                <span className="text-red-400"> Every case is unique.</span>
                            </p>
                        </div>

                        {/* Custom Scenario Section - Always Visible */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-2 mb-2">
                                <Skull className="w-4 h-4 text-red-500" />
                                <span className="text-sm font-medium text-zinc-300">Create Your Mystery</span>
                            </div>
                            
                            <Textarea
                                value={scenarioInput}
                                onChange={(e) => onScenarioInputChange(e.target.value)}
                                placeholder="Describe your murder scenario...

A candlelit dinner party in a crumbling castle. Thunder rumbles outside as the host collapses into their soup..."
                                rows={4}
                                className="bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-600 resize-none rounded-xl transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-700"
                                disabled={isGenerating}
                            />

                            {/* Example Scenarios */}
                            <div>
                                <button
                                    onClick={() => setShowExamples(!showExamples)}
                                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                >
                                    {showExamples ? '− Hide ideas' : '+ Need inspiration?'}
                                </button>
                                {showExamples && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {exampleScenarios.map((example) => (
                                            <Badge
                                                key={example}
                                                variant="outline"
                                                className="cursor-pointer border-zinc-800 text-zinc-400 hover:border-red-500/50 hover:text-red-300 hover:bg-red-500/10 transition-all rounded-lg text-xs"
                                                onClick={() => onScenarioInputChange(example)}
                                            >
                                                {example}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Difficulty Pills */}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className="text-xs text-zinc-500 mr-1">Difficulty:</span>
                                {difficulties.map((d) => (
                                    <button
                                        key={d.value}
                                        onClick={() => onDifficultyChange(d.value)}
                                        disabled={isGenerating}
                                        className={cn(
                                            'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                                            difficulty === d.value
                                                ? 'bg-red-500/20 text-red-300 border border-red-500/50'
                                                : 'bg-zinc-900/50 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                                        )}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>

                            {/* Generate Custom Button */}
                            <Button
                                onClick={onGenerate}
                                disabled={!canGenerate}
                                className={cn(
                                    "w-full h-12 rounded-xl gap-2 font-semibold transition-all duration-300",
                                    canGenerate 
                                        ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-lg shadow-red-900/30 hover:shadow-red-900/50 hover:scale-[1.02]"
                                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                )}
                            >
                                <Sparkles className="h-5 w-5" />
                                Generate Custom Mystery
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Divider */}
                        <div className="flex items-center gap-4 py-1">
                            <div className="flex-1 h-px bg-zinc-800" />
                            <span className="text-xs text-zinc-600 uppercase tracking-wider">or</span>
                            <div className="flex-1 h-px bg-zinc-800" />
                        </div>

                        {/* Quick Start */}
                        <div className="space-y-1.5">
                            <Button
                                onClick={onQuickStart}
                                disabled={isGenerating}
                                variant="outline"
                                className="w-full h-12 bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 hover:border-zinc-400 rounded-xl gap-2 transition-all"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Generating mystery...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="h-5 w-5" />
                                        Quick Start: Villa Sonnenhof
                                    </>
                                )}
                            </Button>
                            <p className="text-xs text-zinc-600 text-center">
                                Jump into our featured mystery scenario
                            </p>
                        </div>

                    </div>
                    )}
                </div>

                {/* Hero Image Section - Right */}
                <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
                    {/* Hero Image with CRT flicker */}
                    <img 
                        src="/images/hero.png" 
                        alt="Mystery Scene" 
                        className="absolute inset-0 w-full h-full object-cover animate-tv-flicker"
                    />
                    
                    {/* Subtle red tint overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-red-950/40 via-zinc-950/20 to-red-900/30 mix-blend-multiply" />
                    
                    {/* Dark vignette - lighter */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />
                    
                    {/* Gradient overlay from left for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/50 to-transparent" />
                    
                    {/* Subtle red glow effects */}
                    <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-red-900/15 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/3 w-48 h-48 bg-red-950/10 rounded-full blur-3xl" />
                    
                    {/* Scan lines effect for creepy vibe */}
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.1)_2px,rgba(0,0,0,0.1)_4px)] pointer-events-none" />
                </div>
            </div>
        </div>
    );
}
