import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { ArrowRight } from 'lucide-react';

interface Persona {
    slug: string;
    name: string;
    role: string;
    description: string;
    emoji: string;
    image?: string;
}

interface Victim {
    name: string;
    role: string;
    description: string;
}

interface IntroductionScreenProps {
    scenarioName: string;
    setting: string;
    victim: Victim;
    location: string;
    timeOfIncident: string;
    timeline: string;
    personas: Persona[];
    introMessage: string;
    caseNumber: string;
    onBeginInvestigation: () => void;
}

export function IntroductionScreen({
    scenarioName,
    setting,
    victim,
    location,
    timeOfIncident,
    timeline,
    personas,
    introMessage,
    caseNumber,
    onBeginInvestigation,
}: IntroductionScreenProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 flex items-center justify-center p-6">
            <div className="max-w-5xl w-full space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="text-6xl mb-4">🔍</div>
                    <h1 className="text-5xl font-bold text-white uppercase tracking-wider">
                        {scenarioName}
                    </h1>
                    <p className="text-red-400 text-lg font-semibold tracking-wider">
                        CASE #{caseNumber}
                    </p>
                </div>

                {/* Main Content Card */}
                <Card className="bg-slate-800/90 border-red-900/50 shadow-2xl">
                    <div className="p-8 space-y-8">
                        {/* Case Briefing */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold text-red-400 uppercase border-b border-red-900/50 pb-2">
                                Fall-Briefing
                            </h2>
                            
                            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-200">
                                    <div>
                                        <span className="text-red-400 font-semibold text-sm uppercase block mb-1">Opfer:</span>
                                        <span className="text-lg font-medium">{victim.name}</span>
                                        <span className="text-slate-400 ml-2">({victim.role})</span>
                                        {victim.description && (
                                            <p className="text-sm text-slate-400 mt-1">{victim.description}</p>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <span className="text-red-400 font-semibold text-sm uppercase block mb-1">Tatort:</span>
                                        <span className="text-lg">{location}</span>
                                    </div>
                                    
                                    <div className="md:col-span-2">
                                        <span className="text-red-400 font-semibold text-sm uppercase block mb-1">Tatzeitpunkt:</span>
                                        <span className="text-lg">{timeOfIncident}</span>
                                    </div>
                                </div>

                                {setting && (
                                    <div className="pt-4 border-t border-slate-700">
                                        <span className="text-red-400 font-semibold text-sm uppercase block mb-2">Hintergrund:</span>
                                        <p className="text-slate-300 leading-relaxed whitespace-pre-line">{setting}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Intro Message */}
                        {introMessage && (
                            <div className="bg-gradient-to-r from-red-950/30 to-slate-900/30 border border-red-900/30 rounded-lg p-6">
                                <p className="text-slate-200 leading-relaxed whitespace-pre-line text-center italic">
                                    {introMessage}
                                </p>
                            </div>
                        )}

                        {/* Suspects Section */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold text-red-400 uppercase border-b border-red-900/50 pb-2">
                                Die Verdächtigen
                            </h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {personas.map((persona) => (
                                    <div 
                                        key={persona.slug}
                                        className="bg-slate-900/50 border border-slate-700 hover:border-red-900/50 rounded-lg p-4 transition-all"
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Persona Image/Emoji */}
                                            <div className="shrink-0">
                                                {persona.image ? (
                                                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-600">
                                                        <img 
                                                            src={persona.image} 
                                                            alt={persona.name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.style.display = 'none';
                                                                const parent = target.parentElement;
                                                                if (parent) {
                                                                    parent.innerHTML = `<div class="text-4xl flex items-center justify-center w-full h-full">${persona.emoji}</div>`;
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="text-4xl">{persona.emoji}</div>
                                                )}
                                            </div>
                                            
                                            {/* Persona Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-bold text-white">
                                                    {persona.name}
                                                </h3>
                                                <p className="text-red-400 text-sm font-medium mb-2">
                                                    {persona.role}
                                                </p>
                                                <p className="text-slate-400 text-sm leading-relaxed">
                                                    {persona.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Timeline */}
                        {timeline && (
                            <div className="space-y-4">
                                <h2 className="text-2xl font-bold text-red-400 uppercase border-b border-red-900/50 pb-2">
                                    Zeitleiste
                                </h2>
                                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                                    <div className="text-slate-300 leading-relaxed whitespace-pre-line">
                                        {timeline}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Begin Investigation Button */}
                        <div className="pt-4">
                            <Button
                                onClick={onBeginInvestigation}
                                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-6 text-lg shadow-lg shadow-red-600/30 transition-all group"
                            >
                                <span>Ermittlung beginnen</span>
                                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Footer */}
                <p className="text-center text-slate-400 text-sm">
                    Befragt die Verdächtigen, sammelt Beweise und findet den Täter
                </p>
            </div>
        </div>
    );
}
