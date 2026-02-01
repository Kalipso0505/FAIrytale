/**
 * Intro Screen V3 - Vintage Case File
 * Authentisches FBI-Dokument im Stil der 60er Jahre
 * Optimiert für Viewport-Höhe ohne Scrollen
 */
import { useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { cn } from '@/lib/utils';
import type { Persona, CaseInfo } from '@/types/game';

interface IntroScreenProps {
    caseInfo: CaseInfo;
    personas: Persona[];
    onBeginInvestigation: () => void;
}

type Page = 1 | 2 | 3;

export function IntroScreenV3({
    caseInfo,
    personas,
    onBeginInvestigation,
}: IntroScreenProps) {
    const [currentPage, setCurrentPage] = useState<Page>(1);

    // Stabile Case Number die sich nicht bei jedem Render ändert
    const caseNumber = useMemo(() => 
        `${Math.floor(Math.random() * 90) + 10}-${Math.floor(Math.random() * 9000) + 1000}`, 
    []);
    
    const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    const goNext = () => currentPage < 3 && setCurrentPage((currentPage + 1) as Page);
    const goPrev = () => currentPage > 1 && setCurrentPage((currentPage - 1) as Page);

    return (
        <div className="h-screen bg-zinc-900 flex items-center justify-center p-4 overflow-hidden">
            {/* Ambient lighting */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(120,80,40,0.15)_0%,_transparent_50%)]" />
            
            {/* Document Container - responsive height */}
            <div className="relative w-full max-w-2xl h-[calc(100vh-2rem)] max-h-[700px]">
                {/* Shadow layers for depth */}
                <div className="absolute inset-0 bg-zinc-950 rounded translate-x-2 translate-y-2" />
                <div className="absolute inset-0 bg-zinc-900 rounded translate-x-1 translate-y-1" />
                
                {/* Main Document */}
                <div 
                    className="relative rounded overflow-hidden h-full flex flex-col"
                    style={{
                        background: 'linear-gradient(135deg, #f5f0e1 0%, #e8e0cc 50%, #f0e8d8 100%)',
                        boxShadow: 'inset 0 0 100px rgba(0,0,0,0.1)',
                    }}
                >
                    {/* Paper texture */}
                    <div 
                        className="absolute inset-0 opacity-30 pointer-events-none"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                        }}
                    />
                    
                    {/* Age stains */}
                    <div className="absolute top-10 right-20 w-32 h-32 rounded-full bg-amber-900/10 blur-xl" />
                    <div className="absolute bottom-20 left-10 w-24 h-24 rounded-full bg-amber-800/10 blur-xl" />
                    
                    {/* Hole punches */}
                    <div className="absolute left-3 top-1/4 w-2.5 h-2.5 rounded-full bg-zinc-900/80 shadow-inner" />
                    <div className="absolute left-3 top-1/2 w-2.5 h-2.5 rounded-full bg-zinc-900/80 shadow-inner" />
                    <div className="absolute left-3 top-3/4 w-2.5 h-2.5 rounded-full bg-zinc-900/80 shadow-inner" />

                    {/* Content - flex-1 to fill available space */}
                    <div className="relative flex-1 flex flex-col p-6 md:p-8 pl-10 md:pl-12 overflow-hidden">
                        
                        {/* Page 1: Cover & Header */}
                        {currentPage === 1 && (
                            <div className="flex-1 flex flex-col animate-in fade-in duration-500">
                                {/* FBI Header */}
                                <div className="text-center mb-4 pb-4 border-b-2 border-zinc-800">
                                    <div className="text-[11px] tracking-[0.3em] mb-1 text-zinc-500 font-mono">
                                        UNITED STATES DEPARTMENT OF JUSTICE
                                    </div>
                                    <div className="text-sm font-bold tracking-[0.15em] text-zinc-800 font-mono">
                                        FEDERAL BUREAU OF INVESTIGATION
                                    </div>
                                </div>

                                {/* Document Info Grid */}
                                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px] mb-4 font-mono text-zinc-700">
                                    <div className="flex">
                                        <span className="w-20 text-zinc-500">Copy to:</span>
                                        <span>1 - USA, Oxford</span>
                                    </div>
                                    <div className="flex">
                                        <span className="w-14 text-zinc-500">Office:</span>
                                        <span className="uppercase truncate">{caseInfo.location.split(',')[0]?.slice(0, 12) || 'FIELD'}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="w-20 text-zinc-500">Report of:</span>
                                        <span>SA DETECTIVE UNIT</span>
                                    </div>
                                    <div className="flex">
                                        <span className="w-14 text-zinc-500">Date:</span>
                                        <span>{currentDate}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="w-20 text-zinc-500">File #:</span>
                                        <span>{caseNumber}</span>
                                    </div>
                                </div>

                                {/* Title Section */}
                                <div className="mb-4 pb-3 border-b border-zinc-300">
                                    <div className="text-[11px] text-zinc-500 mb-1 font-mono">Title:</div>
                                    <div className="text-base font-bold uppercase tracking-wide text-zinc-900 font-mono">
                                        UNKNOWN SUBJECTS; {caseInfo.victim.name.toUpperCase()}
                                    </div>
                                    <div className="text-sm uppercase mt-0.5 text-zinc-600 font-mono">
                                        {caseInfo.scenarioName.toUpperCase()} - VICTIM
                                    </div>
                                </div>

                                {/* Character/Synopsis */}
                                <div className="flex-1 space-y-3 font-mono">
                                    <div>
                                        <span className="text-[11px] text-zinc-500">Character:</span>
                                        <div className="text-[13px] text-zinc-700 uppercase">
                                            HOMICIDE - ACTIVE INVESTIGATION
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[11px] text-zinc-500">Synopsis:</span>
                                        <div className="text-[13px] text-zinc-700 leading-relaxed mt-1">
                                            {caseInfo.setting}. Victim identified as {caseInfo.victim.name}, {caseInfo.victim.role}. 
                                            Incident occurred at {caseInfo.location} on {caseInfo.timeOfIncident}. 
                                            {personas.length} persons of interest identified for questioning.
                                        </div>
                                    </div>
                                </div>

                                {/* Confidential Stamp */}
                                <div className="absolute top-12 right-6 rotate-[-12deg]">
                                    <div className="border-[3px] border-red-700 px-3 py-1.5 text-red-700 font-bold text-base uppercase tracking-wider opacity-70"
                                        style={{ fontFamily: 'Impact, sans-serif' }}
                                    >
                                        CONFIDENTIAL
                                    </div>
                                </div>

                                {/* Classification marker */}
                                <div className="text-center mt-auto pt-2">
                                    <span className="text-[13px] tracking-widest text-zinc-500 font-mono">- C -</span>
                                </div>
                            </div>
                        )}

                        {/* Page 2: Details */}
                        {currentPage === 2 && (
                            <div className="flex-1 flex flex-col animate-in fade-in duration-500 overflow-hidden">
                                <div className="text-sm font-bold uppercase tracking-wider mb-4 pb-2 border-b border-zinc-400 text-zinc-800 font-mono">
                                    DETAILS:
                                </div>

                                <div className="flex-1 space-y-4 text-[13px] leading-relaxed font-mono text-zinc-700 overflow-y-auto pr-2">
                                    {/* Victim Info */}
                                    <div>
                                        <div className="font-bold mb-1.5 underline">VICTIM INFORMATION:</div>
                                        <div className="pl-4 space-y-0.5">
                                            <div>Name: {caseInfo.victim.name.toUpperCase()}</div>
                                            <div>Role: {caseInfo.victim.role}</div>
                                            {caseInfo.victim.description && (
                                                <div className="text-zinc-600">Description: {caseInfo.victim.description}</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Crime Scene */}
                                    <div>
                                        <div className="font-bold mb-1.5 underline">CRIME SCENE:</div>
                                        <div className="pl-4 space-y-0.5">
                                            <div>Location: {caseInfo.location}</div>
                                            <div>Time of Incident: {caseInfo.timeOfIncident}</div>
                                        </div>
                                    </div>

                                    {/* Timeline - nur wenn vorhanden und kurz */}
                                    {caseInfo.timeline && (
                                        <div>
                                            <div className="font-bold mb-1.5 underline">EVENT TIMELINE:</div>
                                            <div className="pl-4 text-zinc-600 line-clamp-3">
                                                {caseInfo.timeline}
                                            </div>
                                        </div>
                                    )}

                                    {/* Suspects List */}
                                    <div>
                                        <div className="font-bold mb-1.5 underline">PERSONS OF INTEREST ({personas.length}):</div>
                                        <div className="pl-4 space-y-1">
                                            {personas.map((persona, idx) => (
                                                <div key={persona.slug} className="flex items-baseline gap-2">
                                                    <span className="font-bold shrink-0">{idx + 1}. {persona.name.toUpperCase()}</span>
                                                    <span className="text-zinc-500 truncate">- {persona.role}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Page number */}
                                <div className="text-right text-[12px] text-zinc-500 font-mono mt-2">
                                    Page 2 of 3
                                </div>
                            </div>
                        )}

                        {/* Page 3: Briefing & Action */}
                        {currentPage === 3 && (
                            <div className="flex-1 flex flex-col animate-in fade-in duration-500">
                                <div className="text-sm font-bold uppercase tracking-wider mb-4 pb-2 border-b border-zinc-400 text-zinc-800 font-mono">
                                    MISSION BRIEFING:
                                </div>

                                <div className="flex-1 text-[13px] leading-relaxed text-zinc-700 font-mono overflow-y-auto pr-2">
                                    {caseInfo.introMessage}
                                </div>

                                {/* Assignment Box */}
                                <div className="border-2 border-zinc-600 p-3 my-4 font-mono">
                                    <div className="text-[11px] text-zinc-500 mb-1">ASSIGNMENT:</div>
                                    <div className="text-[13px] text-zinc-700">
                                        Interview all persons of interest, gather evidence, and identify the perpetrator.
                                    </div>
                                </div>

                                {/* Signature area */}
                                <div className="flex justify-between items-end mb-4">
                                    <div className="font-mono">
                                        <div className="text-[11px] text-zinc-500">Authorized by:</div>
                                        <div className="text-[13px] text-zinc-700">SA DETECTIVE UNIT</div>
                                    </div>
                                    <div className="text-right font-mono">
                                        <div className="text-[11px] text-zinc-500">Classification:</div>
                                        <div className="text-[13px] text-red-700 font-bold">CONFIDENTIAL</div>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <div className="text-center">
                                    <Button
                                        onClick={onBeginInvestigation}
                                        className="bg-zinc-800 hover:bg-zinc-900 text-amber-50 font-bold uppercase tracking-wider px-8 py-2.5 h-auto font-mono"
                                    >
                                        Accept Assignment
                                        <ChevronRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>

                                {/* Footer disclaimer */}
                                <div className="text-[10px] text-zinc-500 leading-tight mt-3 font-mono">
                                    This document is the property of the FBI and is loaned to your agency.
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation - Vintage Style */}
                    <div className="relative flex items-center justify-between px-6 md:px-8 py-2.5 border-t-2 border-zinc-400">
                        <button
                            onClick={goPrev}
                            disabled={currentPage === 1}
                            className={cn(
                                "font-mono text-[12px] uppercase tracking-wider transition-colors",
                                currentPage === 1
                                    ? "text-zinc-400 cursor-not-allowed"
                                    : "text-zinc-600 hover:text-zinc-800"
                            )}
                        >
                            ‹ PREV
                        </button>
                        
                        {/* Page indicator - typewriter style */}
                        <div className="font-mono text-[12px] text-zinc-500 tracking-wider">
                            PAGE <span className="text-zinc-800 font-bold">{currentPage}</span> OF <span className="text-zinc-800 font-bold">3</span>
                        </div>
                        
                        {currentPage < 3 ? (
                            <button
                                onClick={goNext}
                                className="font-mono text-[12px] uppercase tracking-wider text-zinc-600 hover:text-zinc-800 transition-colors"
                            >
                                NEXT ›
                            </button>
                        ) : (
                            <div className="w-12" />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
