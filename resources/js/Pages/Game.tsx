import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { useGameState } from '@/hooks/use-game-state';
import {
    StartScreenV3,
    IntroScreenV3,
    GameLayout,
    GameLayoutV1,
    GameLayoutV2,
    GameLayoutV3,
    GameHeader,
    GameHeaderDark,
    AccuseModal,
    AccuseModalV2,
    ClueNotification,
    HintNotification,
} from '@/Components/Game';
import type { InitialGameData } from '@/types/game';

// 🎨 WÄHLE HIER DEINE GAME-LAYOUT-VARIANTE:
// 'original' = Aktuelles helles Design
// 'v1' = Dark FBI Operations Center (minimalistisch, dunkel)
// 'v2' = FBI Dossier Style (Papier-Ästhetik + dunkler Chat)
// 'v3' = Modern Dark Thriller (clean, modern, beste UX)
const GAME_LAYOUT_VARIANT: 'original' | 'v1' | 'v2' | 'v3' = 'v2';

interface GamePageProps {
    initialGame?: InitialGameData | null;
}

export default function GameNew({ initialGame }: GamePageProps) {
    const game = useGameState(initialGame);
    
    // Update URL when game starts
    useEffect(() => {
        if (game.gameId && game.status !== 'not-started') {
            const currentPath = window.location.pathname;
            const expectedPath = `/game/${game.gameId}`;
            
            if (currentPath !== expectedPath) {
                window.history.replaceState({}, '', expectedPath);
            }
        }
    }, [game.gameId, game.status]);
    
    // Reset URL when game is reset
    useEffect(() => {
        if (game.status === 'not-started' && !game.gameId) {
            const currentPath = window.location.pathname;
            if (currentPath !== '/game') {
                window.history.replaceState({}, '', '/game');
            }
        }
    }, [game.status, game.gameId]);
    const [showAccuseModal, setShowAccuseModal] = useState(false);

    // Prepare case info object
    const caseInfo = {
        scenarioName: game.scenarioName,
        setting: game.setting,
        victim: game.victim,
        location: game.location,
        timeOfIncident: game.timeOfIncident,
        timeline: game.timeline,
        introMessage: game.introMessage,
        crimeSceneImages: game.crimeSceneImages,
    };

    // Handle accusation
    const handleAccuse = async (personaSlug: string) => {
        await game.accuse(personaSlug);
        setShowAccuseModal(false);
    };

    return (
        <>
            <Head title="FAIrytale - Murder Mystery Game" />

            {/* Start Screen */}
            {game.status === 'not-started' && (
                <StartScreenV3
                    scenarioInput={game.scenarioInput}
                    onScenarioInputChange={game.setScenarioInput}
                    difficulty={game.difficulty}
                    onDifficultyChange={game.setDifficulty}
                    onGenerate={game.generateAndStart}
                    onQuickStart={game.quickStart}
                    isGenerating={game.isGenerating}
                />
            )}

            {/* Loading Screen */}
            {game.status === 'loading' && (
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-muted-foreground">
                            Generating your mystery...
                        </p>
                    </div>
                </div>
            )}

            {/* Intro Screen */}
            {game.status === 'intro' && (
                <IntroScreenV3
                    caseInfo={caseInfo}
                    personas={game.personas}
                    onBeginInvestigation={game.beginInvestigation}
                />
            )}

            {/* Active Game */}
            {(game.status === 'active' || game.status === 'solved' || game.status === 'failed') && (
                <>
                    {/* Clue Notification Toast */}
                    <ClueNotification 
                        clue={game.newClue} 
                        onDismiss={game.dismissNewClue} 
                    />
                    
                    {/* Hint Notification Toast */}
                    <HintNotification 
                        hint={game.currentHint} 
                        onDismiss={game.dismissHint} 
                    />
                    
                    {/* V2 has NO header - it's integrated into the layout */}
                    {GAME_LAYOUT_VARIANT === 'v2' ? (
                        <GameLayoutV2
                            personas={game.personas}
                            selectedPersona={game.selectedPersona}
                            messages={game.messages}
                            caseInfo={caseInfo}
                            revealedClues={game.revealedClues}
                            notes={game.notes}
                            isLoading={game.isLoading}
                            pinnedMessages={game.pinnedMessages}
                            savedMessages={game.savedMessages}
                            gameId={game.gameId}
                            status={game.status}
                            hasNewClue={!!game.newClue}
                            isLoadingHint={game.isLoadingHint}
                            hintsUsed={game.hintsUsed}
                            onSelectPersona={game.selectPersona}
                            onSendMessage={game.sendMessage}
                            onNotesChange={game.setNotes}
                            onPinMessage={game.togglePin}
                            onSaveToNotes={game.saveToNotes}
                            getUnreadCount={game.getUnreadCount}
                            onAccuse={() => setShowAccuseModal(true)}
                            onReset={game.reset}
                            onGetHint={game.getHint}
                        />
                    ) : (
                        <div className="h-screen flex flex-col">
                            {GAME_LAYOUT_VARIANT === 'original' ? (
                                <GameHeader
                                    scenarioName={game.scenarioName}
                                    status={game.status}
                                    onAccuse={() => setShowAccuseModal(true)}
                                    onReset={game.reset}
                                />
                            ) : (
                                <GameHeaderDark
                                    scenarioName={game.scenarioName}
                                    status={game.status}
                                    onAccuse={() => setShowAccuseModal(true)}
                                    onReset={game.reset}
                                />
                            )}

                            {GAME_LAYOUT_VARIANT === 'original' && (
                                <GameLayout
                                    personas={game.personas}
                                    selectedPersona={game.selectedPersona}
                                    messages={game.messages}
                                    caseInfo={caseInfo}
                                    revealedClues={game.revealedClues}
                                    notes={game.notes}
                                    isLoading={game.isLoading}
                                    pinnedMessages={game.pinnedMessages}
                                    savedMessages={game.savedMessages}
                                    gameId={game.gameId}
                                    onSelectPersona={game.selectPersona}
                                    onSendMessage={game.sendMessage}
                                    onNotesChange={game.setNotes}
                                    onPinMessage={game.togglePin}
                                    onSaveToNotes={game.saveToNotes}
                                    getUnreadCount={game.getUnreadCount}
                                />
                            )}
                            {GAME_LAYOUT_VARIANT === 'v1' && (
                                <GameLayoutV1
                                    personas={game.personas}
                                    selectedPersona={game.selectedPersona}
                                    messages={game.messages}
                                    caseInfo={caseInfo}
                                    revealedClues={game.revealedClues}
                                    notes={game.notes}
                                    isLoading={game.isLoading}
                                    pinnedMessages={game.pinnedMessages}
                                    savedMessages={game.savedMessages}
                                    gameId={game.gameId}
                                    onSelectPersona={game.selectPersona}
                                    onSendMessage={game.sendMessage}
                                    onNotesChange={game.setNotes}
                                    onPinMessage={game.togglePin}
                                    onSaveToNotes={game.saveToNotes}
                                    getUnreadCount={game.getUnreadCount}
                                />
                            )}
                            {GAME_LAYOUT_VARIANT === 'v3' && (
                                <GameLayoutV3
                                    personas={game.personas}
                                    selectedPersona={game.selectedPersona}
                                    messages={game.messages}
                                    caseInfo={caseInfo}
                                    revealedClues={game.revealedClues}
                                    notes={game.notes}
                                    isLoading={game.isLoading}
                                    pinnedMessages={game.pinnedMessages}
                                    savedMessages={game.savedMessages}
                                    gameId={game.gameId}
                                    onSelectPersona={game.selectPersona}
                                    onSendMessage={game.sendMessage}
                                    onNotesChange={game.setNotes}
                                    onPinMessage={game.togglePin}
                                    onSaveToNotes={game.saveToNotes}
                                    getUnreadCount={game.getUnreadCount}
                                />
                            )}

                            {/* Result Overlay */}
                            {(game.status === 'solved' || game.status === 'failed') && game.solution && (
                                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                    <div className={`max-w-md w-full p-8 rounded-2xl text-center ${
                                        game.status === 'solved' 
                                            ? 'bg-green-50 border-2 border-green-200' 
                                            : 'bg-red-50 border-2 border-red-200'
                                    }`}>
                                        <div className="text-6xl mb-4">
                                            {game.status === 'solved' ? '🎉' : '💀'}
                                        </div>
                                        <h2 className={`text-2xl font-bold mb-4 ${
                                            game.status === 'solved' ? 'text-green-800' : 'text-red-800'
                                        }`}>
                                            {game.status === 'solved' ? 'Case Solved!' : 'Case Failed'}
                                        </h2>
                                        <p className={`mb-6 ${
                                            game.status === 'solved' ? 'text-green-700' : 'text-red-700'
                                        }`}>
                                            {game.solution.message}
                                        </p>
                                        <button
                                            onClick={game.reset}
                                            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                                        >
                                            Play Again
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Result Overlay for V2 - FBI Dossier Style with Solution Reveal */}
                    {GAME_LAYOUT_VARIANT === 'v2' && (game.status === 'solved' || game.status === 'failed') && game.solution && (
                        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                            <div 
                                className="max-w-2xl w-full max-h-[90vh] rounded-lg overflow-hidden font-mono shadow-2xl flex flex-col"
                                style={{ background: 'linear-gradient(135deg, #f5f0e1 0%, #e8e0cc 50%, #f0e8d8 100%)' }}
                            >
                                {/* Header */}
                                <div className={`px-6 py-4 ${game.status === 'solved' ? 'bg-green-800' : 'bg-red-800'}`}>
                                    <div className="text-center">
                                        <p className="text-white/70 text-xs uppercase tracking-widest mb-1">
                                            Case Resolution
                                        </p>
                                        <h2 className="text-white text-xl font-bold uppercase tracking-wide">
                                            {game.status === 'solved' ? 'Case Closed' : 'Investigation Failed'}
                                        </h2>
                                    </div>
                                </div>

                                {/* Content - Scrollable */}
                                <div className="p-6 overflow-y-auto flex-1">
                                    {/* Result Message */}
                                    <div className={`p-4 border-2 mb-6 text-center ${
                                        game.status === 'solved' 
                                            ? 'border-green-600 bg-green-50' 
                                            : 'border-red-600 bg-red-50'
                                    }`}>
                                        <div className="text-4xl mb-2">{game.status === 'solved' ? '🎉' : '💀'}</div>
                                        <p className={`text-sm font-bold ${
                                            game.status === 'solved' ? 'text-green-800' : 'text-red-800'
                                        }`}>
                                            {game.solution.message}
                                        </p>
                                    </div>

                                    {/* Solution Reveal */}
                                    {game.solution.solution && (
                                        <div className="space-y-4 mb-6">
                                            <div className="text-center mb-4">
                                                <span className="text-[10px] text-red-700 uppercase tracking-widest border-b-2 border-red-700 pb-1">
                                                    ★ Case File Declassified ★
                                                </span>
                                            </div>

                                            {/* The Murderer */}
                                            {game.solution.solution.murderer && (
                                                <div className="p-4 border-2 border-red-700 bg-red-50">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-red-700">🔪</span>
                                                        <span className="text-[10px] text-red-700 uppercase tracking-widest font-bold">The Murderer</span>
                                                    </div>
                                                    <p className="text-lg font-bold text-zinc-800 uppercase">
                                                        {game.solution.solution.murderer.name}
                                                    </p>
                                                    <p className="text-xs text-zinc-600">{game.solution.solution.murderer.role}</p>
                                                </div>
                                            )}

                                            {/* The Motive */}
                                            {game.solution.solution.motive && (
                                                <div className="p-4 border-2 border-zinc-400 bg-white/50">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span>💭</span>
                                                        <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">The Motive</span>
                                                    </div>
                                                    <p className="text-sm text-zinc-700">{game.solution.solution.motive}</p>
                                                </div>
                                            )}

                                            {/* The Weapon */}
                                            {game.solution.solution.weapon && (
                                                <div className="p-4 border-2 border-zinc-400 bg-white/50">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span>⚔️</span>
                                                        <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Murder Weapon</span>
                                                    </div>
                                                    <p className="text-sm text-zinc-700">{game.solution.solution.weapon}</p>
                                                </div>
                                            )}

                                            {/* Critical Clues */}
                                            {game.solution.solution.critical_clues && game.solution.solution.critical_clues.length > 0 && (
                                                <div className="p-4 border-2 border-zinc-400 bg-white/50">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span>🔍</span>
                                                        <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Critical Evidence</span>
                                                    </div>
                                                    <ul className="space-y-1">
                                                        {game.solution.solution.critical_clues.map((clue, idx) => (
                                                            <li key={idx} className="text-xs text-zinc-700 flex gap-2">
                                                                <span className="text-red-700">•</span>
                                                                {clue}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
                                        <div className="p-3 border border-zinc-400 bg-white/50 text-center">
                                            <p className="text-zinc-500 uppercase tracking-wider mb-1">Clues Found</p>
                                            <p className="text-xl font-bold text-zinc-700">{game.revealedClues.length}</p>
                                        </div>
                                        <div className="p-3 border border-zinc-400 bg-white/50 text-center">
                                            <p className="text-zinc-500 uppercase tracking-wider mb-1">Interviews</p>
                                            <p className="text-xl font-bold text-zinc-700">
                                                {Object.values(game.messages).reduce((acc, msgs) => acc + msgs.length, 0)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action */}
                                    <button
                                        onClick={game.reset}
                                        className="w-full px-6 py-3 bg-red-700 hover:bg-red-800 text-white rounded font-mono text-sm uppercase tracking-wider transition-colors border-2 border-red-800"
                                    >
                                        Start New Investigation
                                    </button>
                                </div>

                                {/* Footer */}
                                <div className="px-6 py-2 border-t border-zinc-300 text-center bg-zinc-100/50">
                                    <span className="text-[10px] text-red-700 uppercase tracking-widest">
                                        ★ Official Record ★
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Accuse Modal - Use V2 for V2 Layout */}
            {GAME_LAYOUT_VARIANT === 'v2' ? (
                <AccuseModalV2
                    isOpen={showAccuseModal}
                    onClose={() => setShowAccuseModal(false)}
                    personas={game.personas}
                    onAccuse={handleAccuse}
                    isLoading={game.isLoading}
                />
            ) : (
                <AccuseModal
                    isOpen={showAccuseModal}
                    onClose={() => setShowAccuseModal(false)}
                    personas={game.personas}
                    onAccuse={handleAccuse}
                    isLoading={game.isLoading}
                />
            )}
        </>
    );
}
