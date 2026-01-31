import { useState, useEffect } from 'react';

interface Message {
    id?: number;
    persona_slug: string | null;
    content: string;
    is_user: boolean;
    created_at?: string;
    messageId?: string;
}

interface Persona {
    slug: string;
    name: string;
    role: string;
}

interface Victim {
    name: string;
    role: string;
    description: string;
}

interface AutoNote {
    text: string;
    category: 'alibi' | 'motive' | 'relationship' | 'observation' | 'contradiction';
    timestamp: string;
    source_message: string;
}

interface CaseInfoPanelProps {
    revealedClues: string[];
    gameId: string | null;
    scenarioName: string;
    victim: Victim;
    location: string;
    timeOfIncident: string;
    personaCount: number;
    pinnedMessages?: Set<string>;
    messages?: Record<string, Message[]>;
    personas?: Persona[];
    autoNotes?: Record<string, AutoNote[]>;
}

type TabType = 'notes' | 'intel' | 'evidence' | 'case';

const categoryConfig: Record<string, { label: string; color: string; icon: string }> = {
    alibi: { label: 'ALIBI', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10', icon: '🕐' },
    motive: { label: 'MOTIV', color: 'text-red-400 border-red-500/30 bg-red-500/10', icon: '⚡' },
    relationship: { label: 'BEZIEHUNG', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10', icon: '🔗' },
    observation: { label: 'BEOBACHTUNG', color: 'text-green-400 border-green-500/30 bg-green-500/10', icon: '👁️' },
    contradiction: { label: 'WIDERSPRUCH', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10', icon: '⚠️' },
};

export function CaseInfoPanel({ 
    revealedClues, 
    gameId, 
    scenarioName,
    victim,
    location,
    timeOfIncident,
    personaCount,
    pinnedMessages = new Set(), 
    messages = {}, 
    personas = [],
    autoNotes = {}
}: CaseInfoPanelProps) {
    const [activeTab, setActiveTab] = useState<TabType>('intel');
    const [notes, setNotes] = useState<string>('');
    const [collapsedPersonas, setCollapsedPersonas] = useState<Set<string>>(new Set());
    
    const togglePersona = (slug: string) => {
        setCollapsedPersonas(prev => {
            const next = new Set(prev);
            if (next.has(slug)) {
                next.delete(slug);
            } else {
                next.add(slug);
            }
            return next;
        });
    };
    
    // Load notes from localStorage
    useEffect(() => {
        if (gameId) {
            const savedNotes = localStorage.getItem(`case-notes-${gameId}`);
            if (savedNotes) {
                setNotes(savedNotes);
            }
        }
    }, [gameId]);
    
    // Listen for notes updates from saved messages
    useEffect(() => {
        const handleNotesUpdate = () => {
            if (gameId) {
                const savedNotes = localStorage.getItem(`case-notes-${gameId}`);
                if (savedNotes) {
                    setNotes(savedNotes);
                }
            }
        };
        window.addEventListener('notes-updated', handleNotesUpdate);
        return () => window.removeEventListener('notes-updated', handleNotesUpdate);
    }, [gameId]);
    
    // Save notes to localStorage
    useEffect(() => {
        if (gameId && notes !== '') {
            localStorage.setItem(`case-notes-${gameId}`, notes);
        }
    }, [notes, gameId]);
    
    // Get pinned messages
    const getPinnedMessages = () => {
        const pinned: Array<{ message: Message; personaName: string }> = [];
        Object.entries(messages).forEach(([personaSlug, personaMessages]) => {
            personaMessages.forEach((message, index) => {
                // Generate stable messageId if missing
                const messageId = message.messageId || `${gameId}-${personaSlug}-${index}-${message.content.substring(0, 30).replace(/\s/g, '').substring(0, 20)}`;
                if (pinnedMessages.has(messageId)) {
                    const persona = personas.find(p => p.slug === personaSlug);
                    pinned.push({
                        message,
                        personaName: message.is_user ? 'Du' : (persona?.name || personaSlug)
                    });
                }
            });
        });
        return pinned;
    };
    
    // Count total auto notes
    const totalAutoNotes = Object.values(autoNotes).reduce((sum, notes) => sum + notes.length, 0);
    
    // DEBUG: Log autoNotes prop
    console.log('=== CASE INFO PANEL DEBUG ===');
    console.log('autoNotes prop:', autoNotes);
    console.log('totalAutoNotes:', totalAutoNotes);
    
    const tabs: { id: TabType; label: string; badge?: number }[] = [
        { id: 'intel', label: 'INTEL', badge: totalAutoNotes },
        { id: 'notes', label: 'NOTIZEN' },
        { id: 'evidence', label: 'BEWEISE' },
        { id: 'case', label: 'FALL' },
    ];

    return (
        <div className="cia-bg-panel border border-white/10 h-full flex flex-col">
            {/* Tabs Header */}
            <div className="bg-black/50 border-b border-white/10">
                <div className="flex">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex-1 px-2 py-2 text-xs cia-text uppercase font-bold transition-colors
                                border-r border-white/10 last:border-r-0 relative
                                ${activeTab === tab.id
                                    ? 'text-white bg-white/5 border-b-2 border-white/20'
                                    : 'text-gray-400 hover:text-gray-300 hover:bg-black/30'
                                }
                            `}
                        >
                            {tab.label}
                            {tab.badge && tab.badge > 0 && (
                                <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto cia-scrollbar">
                {activeTab === 'intel' && (
                    <div className="p-2">
                        {totalAutoNotes > 0 ? (
                            <div className="space-y-1.5">
                                {/* VICTIM SECTION - Collect all notes mentioning the victim */}
                                {(() => {
                                    const victimName = victim.name;
                                    const victimFirstName = victimName.split(' ')[0];
                                    const victimNameLower = victimName.toLowerCase();
                                    const victimFirstNameLower = victimFirstName.toLowerCase();
                                    
                                    // Collect all notes about the victim from all personas
                                    const victimNotes: Array<{ note: AutoNote; source: string }> = [];
                                    const seenVictimTexts = new Set<string>();
                                    
                                    personas.forEach(persona => {
                                        const personaNotes = autoNotes[persona.slug] || [];
                                        personaNotes.forEach(note => {
                                            const textLower = note.text.toLowerCase();
                                            // Check if note mentions the victim
                                            if (textLower.includes(victimNameLower) || 
                                                textLower.includes(victimFirstNameLower) ||
                                                textLower.includes('opfer') ||
                                                textLower.includes('verstorbene') ||
                                                textLower.includes('tote')) {
                                                // Deduplicate
                                                const normalized = textLower;
                                                if (!seenVictimTexts.has(normalized)) {
                                                    seenVictimTexts.add(normalized);
                                                    victimNotes.push({ 
                                                        note, 
                                                        source: persona.name.split(' ')[0] 
                                                    });
                                                }
                                            }
                                        });
                                    });
                                    
                                    if (victimNotes.length === 0) return null;
                                    
                                    const isVictimCollapsed = collapsedPersonas.has('_victim');
                                    
                                    return (
                                        <div className="border border-red-500/30 bg-red-500/5 rounded overflow-hidden">
                                            {/* Victim Header */}
                                            <button
                                                onClick={() => togglePersona('_victim')}
                                                className="w-full px-2 py-1.5 bg-red-500/10 flex items-center justify-between hover:bg-red-500/20 transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] text-red-400 transition-transform ${isVictimCollapsed ? '' : 'rotate-90'}`}>▶</span>
                                                    <span className="text-xs font-bold text-red-400 cia-text">☠ {victimName}</span>
                                                    <span className="text-[10px] text-red-400/60">(OPFER)</span>
                                                </div>
                                                <span className="text-[10px] text-red-400 bg-red-500/20 px-1.5 rounded">{victimNotes.length}</span>
                                            </button>
                                            {/* Victim Notes */}
                                            {!isVictimCollapsed && (
                                                <div className="p-1.5 pt-1 space-y-0.5 border-t border-red-500/20">
                                                    {victimNotes.map(({ note, source }, idx) => {
                                                        const config = categoryConfig[note.category] || categoryConfig.observation;
                                                        return (
                                                            <div key={idx} className="flex items-start gap-1.5 px-1 py-0.5">
                                                                <span className="text-[11px] shrink-0" title={config.label}>{config.icon}</span>
                                                                <span className="text-[11px] text-white/90 cia-text leading-tight">{note.text}</span>
                                                                <span className="text-[9px] text-gray-500 shrink-0">({source})</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                                
                                {/* Group by persona, then by category */}
                                {personas.map(persona => {
                                    const personaNotes = autoNotes[persona.slug] || [];
                                    if (personaNotes.length === 0) return null;
                                    
                                    const isCollapsed = collapsedPersonas.has(persona.slug);
                                    const firstName = persona.name.split(' ')[0];
                                    
                                    // Deduplicate notes by text and remove persona name from text
                                    const seenTexts = new Set<string>();
                                    const uniqueNotes = personaNotes.filter(note => {
                                        const normalized = note.text.toLowerCase();
                                        if (seenTexts.has(normalized)) return false;
                                        seenTexts.add(normalized);
                                        return true;
                                    }).map(note => ({
                                        ...note,
                                        // Remove persona name from the beginning of the note
                                        text: note.text
                                            .replace(new RegExp(`^${persona.name}\\s*`, 'i'), '')
                                            .replace(new RegExp(`^${firstName}\\s*`, 'i'), '')
                                            .replace(/^(hat|ist|war|wurde|erwähnte|sagte|meinte)\s*/i, (match) => match.charAt(0).toUpperCase() + match.slice(1))
                                    }));
                                    
                                    // Group notes by category
                                    const notesByCategory = uniqueNotes.reduce((acc, note) => {
                                        if (!acc[note.category]) acc[note.category] = [];
                                        acc[note.category].push(note);
                                        return acc;
                                    }, {} as Record<string, AutoNote[]>);
                                    
                                    return (
                                        <div key={persona.slug} className="cia-bg-dark border border-white/10 rounded overflow-hidden">
                                            {/* Persona Header - Clickable */}
                                            <button
                                                onClick={() => togglePersona(persona.slug)}
                                                className="w-full px-2 py-1.5 bg-white/5 flex items-center justify-between hover:bg-white/10 transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}>▶</span>
                                                    <span className="text-xs font-bold text-white cia-text">{persona.name}</span>
                                                </div>
                                                <span className="text-[10px] text-gray-400 bg-white/10 px-1.5 rounded">{uniqueNotes.length}</span>
                                            </button>
                                            {/* Notes grouped by category - Collapsible */}
                                            {!isCollapsed && (
                                                <div className="p-1.5 pt-1 space-y-0.5 border-t border-white/5">
                                                    {(['alibi', 'motive', 'relationship', 'observation', 'contradiction'] as const).map(category => {
                                                        const notes = notesByCategory[category];
                                                        if (!notes || notes.length === 0) return null;
                                                        const config = categoryConfig[category];
                                                        
                                                        return notes.map((note, idx) => (
                                                            <div key={`${category}-${idx}`} className="flex items-start gap-1.5 px-1 py-0.5">
                                                                <span className="text-[11px] shrink-0" title={config.label}>{config.icon}</span>
                                                                <span className="text-[11px] text-white/90 cia-text leading-tight">{note.text}</span>
                                                            </div>
                                                        ));
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="cia-bg-dark border border-white/10 p-4 text-center">
                                <p className="text-[10px] text-gray-400 cia-text">KEINE INTEL</p>
                                <p className="text-[10px] text-gray-500 cia-text mt-1">Befrage Verdächtige</p>
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'notes' && (
                    <div className="p-4 h-full flex flex-col">
                        <div className="mb-3">
                            <h3 className="text-xs text-white uppercase cia-text font-bold mb-2">
                                INVESTIGATION NOTES
                            </h3>
                            <p className="text-xs text-gray-400 cia-text">
                                Record your observations and findings
                            </p>
                        </div>
                        
                        {/* Pinned Messages */}
                        {pinnedMessages.size > 0 && (
                            <div className="mb-4">
                                <div className="mb-2">
                                    <h4 className="text-xs cia-text-yellow uppercase cia-text font-bold">
                                        ANGEPINNTE NACHRICHTEN ({pinnedMessages.size})
                                    </h4>
                                </div>
                                <div className="space-y-2 max-h-40 overflow-y-auto cia-scrollbar mb-3">
                                    {getPinnedMessages().map((item, index) => (
                                        <div 
                                            key={index}
                                            className="cia-bg-dark border border-yellow-500/30 rounded p-2 text-xs"
                                        >
                                            <div className="mb-1">
                                                <span className="cia-text-yellow font-semibold">{item.personaName}</span>
                                            </div>
                                            <p className="cia-text text-white text-xs line-clamp-2">{item.message.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Enter your notes here..."
                            className="
                                flex-1 w-full resize-none cia-bg-dark border border-white/10 
                                px-3 py-2 text-white cia-text text-sm rounded
                                focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10
                                placeholder-gray-500
                            "
                        />
                        <div className="mt-3 pt-3 border-t border-white/10 text-xs cia-text text-gray-400">
                            <span>CHARACTERS: {notes.length}</span>
                        </div>
                    </div>
                )}
                
                {activeTab === 'evidence' && (
                    <div className="p-4">
                        <div className="mb-4">
                            <h3 className="text-xs text-white uppercase cia-text font-bold mb-2">
                                EVIDENCE STORAGE
                            </h3>
                            <p className="text-xs text-gray-400 cia-text">
                                Collected evidence and clues
                            </p>
                        </div>
                        
                        {revealedClues.length > 0 ? (
                            <div className="space-y-3">
                                {revealedClues.map((clue, index) => (
                                    <div 
                                        key={index}
                                        className="cia-document p-3 border border-gray-300"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="text-xs cia-text font-bold uppercase">
                                                EVIDENCE #{String(index + 1).padStart(3, '0')}
                                            </span>
                                            <span className="text-xs cia-text text-gray-600">
                                                {new Date().toLocaleDateString('de-DE')}
                                            </span>
                                        </div>
                                        <p className="text-sm cia-text">{clue}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="cia-bg-dark border border-white/10 p-6 text-center">
                                <p className="text-xs text-gray-400 cia-text">
                                    NO EVIDENCE COLLECTED
                                </p>
                                <p className="text-xs text-gray-500 cia-text mt-2">
                                    Interrogate subjects to gather evidence
                                </p>
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'case' && (
                    <div className="p-4 space-y-4">
                        <div className="cia-document p-4">
                            <div className="border-b-2 border-black pb-2 mb-3">
                                <h3 className="text-sm font-bold uppercase cia-text">{scenarioName}</h3>
                                <p className="text-xs text-gray-600 cia-text">CASE <span className="cia-monospace">#{gameId?.toUpperCase().slice(0, 8) || 'N/A'}</span></p>
                            </div>
                            
                            <div className="space-y-3 text-xs cia-text">
                                <div>
                                    <span className="font-bold uppercase">VICTIM:</span>
                                    <span className="ml-2">{victim.name}, {victim.role}</span>
                                </div>
                                <div>
                                    <span className="font-bold uppercase">STATUS:</span>
                                    <span className="ml-2 text-red-600">DECEASED</span>
                                </div>
                                <div>
                                    <span className="font-bold uppercase">LOCATION:</span>
                                    <span className="ml-2">{location}</span>
                                </div>
                                <div>
                                    <span className="font-bold uppercase">TIME OF INCIDENT:</span>
                                    <span className="ml-2">{timeOfIncident}</span>
                                </div>
                                <div className="pt-2 border-t border-gray-300">
                                    <span className="font-bold uppercase">CASE ID:</span>
                                    <span className="ml-2 cia-monospace font-mono">{gameId?.toUpperCase().slice(0, 8) || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="cia-bg-dark border border-white/10 p-4">
                            <h4 className="text-xs text-white uppercase cia-text font-bold mb-3">
                                INVESTIGATION STATUS
                            </h4>
                            <div className="space-y-2 text-xs cia-text">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">SUBJECTS INTERROGATED:</span>
                                    <span className="text-white">{personaCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">EVIDENCE COLLECTED:</span>
                                    <span className="text-white">{revealedClues.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">STATUS:</span>
                                    <span className="cia-text-yellow cia-pulse">ACTIVE</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="cia-bg-dark border border-white/10 p-4">
                            <h4 className="text-xs text-white uppercase cia-text font-bold mb-3">
                                SYSTEM INFORMATION
                            </h4>
                            <div className="space-y-2 text-xs cia-text text-gray-400">
                                <div className="flex justify-between">
                                    <span>SECURITY LEVEL:</span>
                                    <span className="text-white">SEC 113</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>CLASSIFICATION:</span>
                                    <span className="cia-text-yellow">TOP SECRET</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>ACCESS LEVEL:</span>
                                    <span className="text-white">AUTHORIZED</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
