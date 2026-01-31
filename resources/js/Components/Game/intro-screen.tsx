import { MapPin, Clock, Users, AlertTriangle, ChevronRight } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/Components/ui/avatar';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Separator } from '@/Components/ui/separator';
import type { Persona, Victim, CaseInfo } from '@/types/game';

interface IntroScreenProps {
    caseInfo: CaseInfo;
    personas: Persona[];
    onBeginInvestigation: () => void;
}

export function IntroScreen({
    caseInfo,
    personas,
    onBeginInvestigation,
}: IntroScreenProps) {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-destructive/5">
            <div className="w-full max-w-4xl">
                <ScrollArea className="h-[calc(100vh-2rem)] rounded-2xl">
                    <div className="bg-card border rounded-2xl shadow-medium p-6 md:p-10">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-medium mb-4">
                                <AlertTriangle className="h-4 w-4" />
                                Case Briefing
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                                {caseInfo.scenarioName}
                            </h1>
                            <p className="text-muted-foreground max-w-2xl mx-auto">
                                {caseInfo.setting}
                            </p>
                        </div>

                        {/* Intro Message */}
                        <div className="bg-muted/30 rounded-xl p-6 mb-8 border">
                            <p className="text-foreground leading-relaxed whitespace-pre-line">
                                {caseInfo.introMessage}
                            </p>
                        </div>

                        {/* Case Details Grid */}
                        <div className="grid md:grid-cols-2 gap-6 mb-8">
                            {/* Victim Card */}
                            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                                        <AlertTriangle className="h-4 w-4 text-destructive" />
                                    </div>
                                    <h3 className="font-semibold text-destructive uppercase text-sm">
                                        The Victim
                                    </h3>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xl font-bold text-foreground">
                                        {caseInfo.victim.name}
                                    </p>
                                    <p className="text-muted-foreground">
                                        {caseInfo.victim.role}
                                    </p>
                                    {caseInfo.victim.description && (
                                        <p className="text-sm text-muted-foreground">
                                            {caseInfo.victim.description}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Crime Scene Details */}
                            <div className="bg-muted/30 rounded-xl p-5 border">
                                <h3 className="font-semibold text-foreground mb-4">
                                    Crime Scene Details
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase mb-0.5">Location</p>
                                            <p className="text-sm text-foreground">{caseInfo.location}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase mb-0.5">Time of Incident</p>
                                            <p className="text-sm text-foreground">{caseInfo.timeOfIncident}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Timeline */}
                        {caseInfo.timeline && (
                            <div className="mb-8">
                                <h3 className="font-semibold text-foreground mb-3">
                                    Event Timeline
                                </h3>
                                <div className="bg-muted/30 rounded-xl p-5 border">
                                    <p className="text-sm text-foreground whitespace-pre-line">
                                        {caseInfo.timeline}
                                    </p>
                                </div>
                            </div>
                        )}

                        <Separator className="my-8" />

                        {/* Suspects */}
                        <div className="mb-8">
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="h-5 w-5 text-muted-foreground" />
                                <h3 className="font-semibold text-foreground">
                                    Suspects ({personas.length})
                                </h3>
                            </div>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {personas.map((persona) => (
                                    <div
                                        key={persona.slug}
                                        className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border"
                                    >
                                        <Avatar className="h-12 w-12 shrink-0">
                                            {persona.image ? (
                                                <AvatarImage src={persona.image} alt={persona.name} />
                                            ) : null}
                                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                                {persona.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="font-medium text-foreground truncate">
                                                {persona.name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {persona.role}
                                            </p>
                                            {persona.description && (
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                    {persona.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="text-center">
                            <Button
                                onClick={onBeginInvestigation}
                                size="lg"
                                className="gap-2 h-14 px-8 text-base"
                            >
                                Begin Investigation
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                            <p className="text-xs text-muted-foreground mt-3">
                                Interview suspects and gather evidence to solve the case
                            </p>
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
