import { useState } from 'react';
import { Head } from '@inertiajs/react';
import { useGameState } from '@/hooks/use-game-state';
import {
    StartScreenV3,
    IntroScreenV3,
    GameLayout,
    GameHeader,
    AccuseModal,
} from '@/Components/Game';

export default function GameNew() {
    const game = useGameState();
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
                <div className="h-screen flex flex-col">
                    <GameHeader
                        scenarioName={game.scenarioName}
                        status={game.status}
                        onAccuse={() => setShowAccuseModal(true)}
                        onReset={game.reset}
                    />

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

            {/* Accuse Modal */}
            <AccuseModal
                isOpen={showAccuseModal}
                onClose={() => setShowAccuseModal(false)}
                personas={game.personas}
                onAccuse={handleAccuse}
                isLoading={game.isLoading}
            />
        </>
    );
}
