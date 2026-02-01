/**
 * Generation Progress Display Component
 * Shows real-time progress during AI scenario generation via WebSocket
 */
import { Check, Loader2, Skull, User, Sparkles, AlertCircle, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GenerationProgress, ProgressStage } from '@/hooks/use-generation-progress';

interface GenerationProgressProps {
    progress: GenerationProgress;
}

interface ProgressStep {
    stage: ProgressStage[];
    label: string;
    icon: React.ReactNode;
}

const steps: ProgressStep[] = [
    {
        stage: ['started', 'generating_scenario'],
        label: 'Erstelle Szenario',
        icon: <Sparkles className="h-4 w-4" />,
    },
    {
        stage: ['scenario_complete', 'generating_personas'],
        label: 'Generiere Charaktere',
        icon: <User className="h-4 w-4" />,
    },
    {
        stage: ['persona_complete'],
        label: 'Charaktere werden erstellt',
        icon: <User className="h-4 w-4" />,
    },
    {
        stage: ['generating_images'],
        label: 'Generiere Tatort-Bilder',
        icon: <Image className="h-4 w-4" />,
    },
    {
        stage: ['initializing_game'],
        label: 'Initialisiere Spiel',
        icon: <Skull className="h-4 w-4" />,
    },
    {
        stage: ['complete'],
        label: 'Fertig!',
        icon: <Check className="h-4 w-4" />,
    },
];

function getStepStatus(
    step: ProgressStep,
    currentStage: ProgressStage,
    stepIndex: number
): 'completed' | 'active' | 'pending' {
    const stageOrder: ProgressStage[] = [
        'started',
        'generating_scenario',
        'scenario_complete',
        'generating_personas',
        'persona_complete',
        'generating_images',
        'initializing_game',
        'complete',
    ];
    
    const currentIndex = stageOrder.indexOf(currentStage);
    
    // Special case for persona_complete - it's part of generating_personas
    if (step.stage.includes('persona_complete') && currentStage === 'persona_complete') {
        return 'active';
    }
    
    // Check if current stage is in this step
    if (step.stage.includes(currentStage)) {
        return 'active';
    }
    
    // Check if we've passed this step
    const stepStageIndices = step.stage.map(s => stageOrder.indexOf(s)).filter(i => i >= 0);
    const maxStepIndex = Math.max(...stepStageIndices);
    
    if (currentIndex > maxStepIndex) {
        return 'completed';
    }
    
    return 'pending';
}

export function GenerationProgressDisplay({ progress }: GenerationProgressProps) {
    const isError = progress.stage === 'error';
    
    return (
        <div className="w-full max-w-md mx-auto space-y-6 p-6 bg-zinc-900/80 rounded-2xl border border-zinc-800 backdrop-blur-sm">
            {/* Header */}
            <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-white flex items-center justify-center gap-2">
                    {isError ? (
                        <>
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            Fehler
                        </>
                    ) : (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin text-red-500" />
                            Generiere Mystery...
                        </>
                    )}
                </h3>
                <p className="text-sm text-zinc-400">
                    {progress.message || 'Bitte warten...'}
                </p>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                        className={cn(
                            "h-full transition-all duration-500 ease-out rounded-full",
                            isError ? "bg-red-600" : "bg-gradient-to-r from-red-600 to-red-500"
                        )}
                        style={{ width: `${progress.progress}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs text-zinc-500">
                    <span>{progress.progress}%</span>
                    <span>
                        {progress.stage === 'persona_complete' && progress.personaIndex !== undefined && progress.totalPersonas
                            ? `Charakter ${progress.personaIndex + 1}/${progress.totalPersonas}`
                            : ''
                        }
                    </span>
                </div>
            </div>
            
            {/* Step Indicators */}
            <div className="space-y-3">
                {steps.slice(0, -1).map((step, index) => {
                    const status = getStepStatus(step, progress.stage, index);
                    
                    return (
                        <div
                            key={step.label}
                            className={cn(
                                "flex items-center gap-3 text-sm transition-all",
                                status === 'completed' && "text-zinc-400",
                                status === 'active' && "text-white",
                                status === 'pending' && "text-zinc-600"
                            )}
                        >
                            <div
                                className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                    status === 'completed' && "bg-green-500/20 text-green-400",
                                    status === 'active' && "bg-red-500/20 text-red-400",
                                    status === 'pending' && "bg-zinc-800 text-zinc-600"
                                )}
                            >
                                {status === 'completed' ? (
                                    <Check className="h-4 w-4" />
                                ) : status === 'active' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    step.icon
                                )}
                            </div>
                            <span className="flex-1">{step.label}</span>
                            
                            {/* Show completed personas */}
                            {step.stage.includes('persona_complete') && progress.completedPersonas.length > 0 && (
                                <div className="flex -space-x-1">
                                    {progress.completedPersonas.map((name, i) => (
                                        <div
                                            key={name}
                                            className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center text-xs text-green-400"
                                            title={name}
                                        >
                                            {name.charAt(0)}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {/* Tip */}
            <p className="text-xs text-zinc-600 text-center italic">
                KI-generierte Szenarien sind einzigartig - dies kann 15-30 Sekunden dauern
            </p>
        </div>
    );
}
