import { FileText, MapPin, Clock, User, BookOpen, AlertTriangle, StickyNote } from 'lucide-react';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Separator } from '@/Components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Textarea } from '@/Components/ui/textarea';
import type { CaseInfo } from '@/types/game';

interface CaseInfoPanelProps {
    caseInfo: CaseInfo;
    revealedClues: string[];
    notes: string;
    onNotesChange: (notes: string) => void;
}

interface InfoItemProps {
    icon: React.ReactNode;
    label: string;
    value: string;
}

function InfoItem({ icon, label, value }: InfoItemProps) {
    return (
        <div className="flex gap-3">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                    {label}
                </p>
                <p className="text-sm text-foreground">
                    {value}
                </p>
            </div>
        </div>
    );
}

export function CaseInfoPanel({
    caseInfo,
    revealedClues,
    notes,
    onNotesChange,
}: CaseInfoPanelProps) {
    return (
        <div className="h-full flex flex-col bg-card border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                    Case File
                </h3>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="case" className="flex-1 flex flex-col">
                <TabsList className="mx-4 mt-3 grid grid-cols-3 h-9">
                    <TabsTrigger value="case" className="text-xs">Case</TabsTrigger>
                    <TabsTrigger value="clues" className="text-xs">
                        Clues
                        {revealedClues.length > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full">
                                {revealedClues.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
                </TabsList>

                {/* Case Tab */}
                <TabsContent value="case" className="flex-1 mt-0">
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-4">
                            {/* Scenario Name */}
                            <div>
                                <h4 className="text-base font-bold text-foreground mb-1">
                                    {caseInfo.scenarioName}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    {caseInfo.setting}
                                </p>
                            </div>

                            <Separator />

                            {/* Victim */}
                            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="h-4 w-4 text-destructive" />
                                    <span className="text-xs font-semibold text-destructive uppercase">
                                        Victim
                                    </span>
                                </div>
                                <p className="font-semibold text-foreground">
                                    {caseInfo.victim.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {caseInfo.victim.role}
                                </p>
                                {caseInfo.victim.description && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {caseInfo.victim.description}
                                    </p>
                                )}
                            </div>

                            {/* Details */}
                            <div className="space-y-3">
                                <InfoItem
                                    icon={<MapPin className="h-4 w-4" />}
                                    label="Location"
                                    value={caseInfo.location}
                                />
                                <InfoItem
                                    icon={<Clock className="h-4 w-4" />}
                                    label="Time of Incident"
                                    value={caseInfo.timeOfIncident}
                                />
                            </div>

                            <Separator />

                            {/* Timeline */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs font-medium text-muted-foreground uppercase">
                                        Timeline
                                    </span>
                                </div>
                                <p className="text-sm text-foreground whitespace-pre-line">
                                    {caseInfo.timeline}
                                </p>
                            </div>
                        </div>
                    </ScrollArea>
                </TabsContent>

                {/* Clues Tab */}
                <TabsContent value="clues" className="flex-1 mt-0">
                    <ScrollArea className="h-full">
                        <div className="p-4">
                            {revealedClues.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                                        <FileText className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        No clues discovered yet
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Interview suspects to uncover evidence
                                    </p>
                                </div>
                            ) : (
                                <ul className="space-y-3">
                                    {revealedClues.map((clue, index) => (
                                        <li
                                            key={index}
                                            className="flex gap-3 p-3 rounded-lg bg-success/5 border border-success/20"
                                        >
                                            <div className="shrink-0 w-6 h-6 rounded-full bg-success/20 flex items-center justify-center text-xs font-bold text-success">
                                                {index + 1}
                                            </div>
                                            <p className="text-sm text-foreground">
                                                {clue}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>

                {/* Notes Tab */}
                <TabsContent value="notes" className="flex-1 mt-0 flex flex-col">
                    <div className="flex-1 p-4 flex flex-col">
                        <div className="flex items-center gap-2 mb-3">
                            <StickyNote className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">
                                Your investigation notes
                            </span>
                        </div>
                        <Textarea
                            value={notes}
                            onChange={(e) => onNotesChange(e.target.value)}
                            placeholder="Write your notes here...

- Key observations
- Suspect inconsistencies
- Your theories"
                            className="flex-1 resize-none text-sm"
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
