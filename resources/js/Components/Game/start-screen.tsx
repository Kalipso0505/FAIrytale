import { useState } from 'react';
import { Sparkles, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Textarea } from '@/Components/ui/textarea';
import { Badge } from '@/Components/ui/badge';
import { cn } from '@/lib/utils';
import type { Difficulty } from '@/types/game';

interface StartScreenProps {
    scenarioInput: string;
    onScenarioInputChange: (value: string) => void;
    difficulty: Difficulty;
    onDifficultyChange: (value: Difficulty) => void;
    onGenerate: () => void;
    onQuickStart: () => void;
    isGenerating: boolean;
}

const difficulties: { value: Difficulty; label: string; description: string }[] = [
    { value: 'einfach', label: 'Easy', description: 'More hints, obvious clues' },
    { value: 'mittel', label: 'Medium', description: 'Balanced challenge' },
    { value: 'schwer', label: 'Hard', description: 'Minimal hints, complex motives' },
];

const exampleScenarios = [
    'A wedding party at a vineyard',
    'A tech startup office after hours',
    'A cruise ship in the Mediterranean',
    'A ski lodge during a blizzard',
];

export function StartScreen({
    scenarioInput,
    onScenarioInputChange,
    difficulty,
    onDifficultyChange,
    onGenerate,
    onQuickStart,
    isGenerating,
}: StartScreenProps) {
    const [showExamples, setShowExamples] = useState(false);

    const canGenerate = scenarioInput.trim().length > 10 && !isGenerating;

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-foreground mb-2">
                        FAIrytale
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        AI-Powered Murder Mystery Game
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-card border rounded-2xl shadow-medium p-6 md:p-8">
                    {/* Quick Start Option */}
                    <div className="mb-8">
                        <Button
                            onClick={onQuickStart}
                            disabled={isGenerating}
                            variant="default"
                            size="lg"
                            className="w-full gap-2 h-14 text-base"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Zap className="h-5 w-5" />
                                    Quick Start – Villa Sonnenhof Murder Mystery
                                </>
                            )}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground mt-2">
                            Jump right in with our curated mystery scenario
                        </p>
                    </div>

                    <div className="relative flex items-center gap-4 mb-8">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs font-medium text-muted-foreground uppercase">
                            Or create your own
                        </span>
                        <div className="flex-1 h-px bg-border" />
                    </div>

                    {/* Custom Scenario Input */}
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">
                                Describe your scenario
                            </label>
                            <Textarea
                                value={scenarioInput}
                                onChange={(e) => onScenarioInputChange(e.target.value)}
                                placeholder="Describe the setting for your murder mystery...

Example: A wedding celebration at a vineyard in Tuscany. The guests include family members with old grudges, a suspicious wedding planner, and the groom's ex..."
                                rows={4}
                                className="resize-none"
                                disabled={isGenerating}
                            />
                        </div>

                        {/* Example Scenarios */}
                        <div>
                            <button
                                onClick={() => setShowExamples(!showExamples)}
                                className="text-xs text-primary hover:underline"
                            >
                                {showExamples ? 'Hide examples' : 'Need inspiration?'}
                            </button>
                            {showExamples && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {exampleScenarios.map((example) => (
                                        <Badge
                                            key={example}
                                            variant="outline"
                                            className="cursor-pointer hover:bg-primary/10"
                                            onClick={() => onScenarioInputChange(example)}
                                        >
                                            {example}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Difficulty Selection */}
                    <div className="mb-6">
                        <label className="text-sm font-medium text-foreground mb-3 block">
                            Difficulty
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {difficulties.map((d) => (
                                <button
                                    key={d.value}
                                    onClick={() => onDifficultyChange(d.value)}
                                    disabled={isGenerating}
                                    className={cn(
                                        'p-3 rounded-lg border text-left transition-all',
                                        difficulty === d.value
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'border-border hover:border-primary/50'
                                    )}
                                >
                                    <p className="font-medium text-sm text-foreground">
                                        {d.label}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {d.description}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Generate Button */}
                    <Button
                        onClick={onGenerate}
                        disabled={!canGenerate}
                        variant="outline"
                        size="lg"
                        className="w-full gap-2 h-12"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Generating your mystery...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-5 w-5" />
                                Generate Custom Scenario
                                <ArrowRight className="h-4 w-4 ml-1" />
                            </>
                        )}
                    </Button>
                </div>

                {/* Footer */}
                <p className="text-xs text-center text-muted-foreground mt-6">
                    Built with AI-powered multi-agent technology for immersive storytelling
                </p>
            </div>
        </div>
    );
}
