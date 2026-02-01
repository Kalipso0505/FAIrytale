<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\ChatMessage;
use App\Models\Game;
use App\Services\AiService;
use Dedoc\Scramble\Attributes\ExcludeRouteFromDocs;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Murder Mystery Spiel-Endpunkte
 */
#[Group('Game')]
class GameController extends Controller
{
    public function __construct(
        private readonly AiService $aiService
    ) {}

    private function log(string $level, string $message, array $context = []): void
    {
        Log::channel('game')->{$level}($message, $context);
    }

    /**
     * Show the game page (start screen)
     */
    #[ExcludeRouteFromDocs]
    public function index(): Response
    {
        return Inertia::render('Game');
    }

    /**
     * Show a specific game by ID
     */
    #[ExcludeRouteFromDocs]
    public function show(string $gameId): Response
    {
        $game = Game::with('messages')->findOrFail($gameId);

        // Get game state from AI service
        try {
            $gameInfo = $this->aiService->getGameState($gameId);
        } catch (\Exception $e) {
            $this->log('warning', 'Could not load game state from AI service', [
                'game_id' => $gameId,
                'error' => $e->getMessage(),
            ]);
            $gameInfo = null;
        }

        return Inertia::render('Game', [
            'initialGame' => $gameInfo ? [
                'game_id' => $game->id,
                'status' => $game->status,
                'scenario_name' => $gameInfo['scenario_name'] ?? 'Unknown',
                'setting' => $gameInfo['setting'] ?? '',
                'victim' => $gameInfo['victim'] ?? null,
                'location' => $gameInfo['location'] ?? '',
                'time_of_incident' => $gameInfo['time_of_incident'] ?? '',
                'timeline' => $gameInfo['timeline'] ?? '',
                'personas' => $gameInfo['personas'] ?? [],
                'intro_message' => $gameInfo['intro_message'] ?? '',
                'revealed_clues' => $game->revealed_clues ?? [],
                'messages' => $game->messages->groupBy('persona_slug')->map(function ($messages) {
                    return $messages->map(fn ($msg) => [
                        'persona_slug' => $msg->persona_slug,
                        'content' => $msg->content,
                        'is_user' => $msg->isUserMessage(),
                        'messageId' => $msg->id,
                    ])->values();
                })->toArray(),
            ] : null,
        ]);
    }

    /**
     * Generate a new scenario and start game
     */
    public function generateAndStart(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_input' => 'nullable|string|max:500',
            'difficulty' => 'required|in:einfach,mittel,schwer',
            'game_id' => 'nullable|uuid', // Optional: client can provide ID for WebSocket progress
        ]);

        // Create game entry first (use client-provided ID for WebSocket subscription)
        $gameData = [
            'user_id' => $request->user()?->id,
            'scenario_slug' => 'generated_'.Str::random(8),
            'status' => 'active',
            'revealed_clues' => [],
            'expires_at' => now()->addMinutes(60),
        ];

        // If client provided a game_id, use it (for WebSocket progress tracking)
        if (! empty($validated['game_id'])) {
            $gameData['id'] = $validated['game_id'];
        }

        $game = Game::create($gameData);

        $this->log('info', 'Game created', [
            'game_id' => $game->id,
            'difficulty' => $validated['difficulty'],
            'type' => 'generated',
        ]);

        $startTime = microtime(true);

        try {
            // Generate scenario via AI Service
            $scenarioResult = $this->aiService->generateScenario(
                $game->id,
                $validated['user_input'] ?? '',
                $validated['difficulty']
            );

            // Initialize game with generated scenario
            $gameInfo = $this->aiService->startGame($game->id);

            $duration = round(microtime(true) - $startTime, 2);

            // Build log context with metrics from AI service
            $logContext = [
                'game_id' => $game->id,
                'scenario' => $gameInfo['scenario_name'] ?? 'unknown',
                'generation_sec' => $duration,
            ];

            // Add detailed metrics if available
            if (isset($scenarioResult['metrics'])) {
                $metrics = $scenarioResult['metrics'];
                $logContext['metrics'] = [
                    'total_sec' => $metrics['total_sec'] ?? null,
                    'phase1_sec' => $metrics['phase1_sec'] ?? null,
                    'phase2_sec' => $metrics['phase2_sec'] ?? null,
                    'retries' => $metrics['retries'] ?? 0,
                ];

                // Log warning if there were retries
                if (($metrics['retries'] ?? 0) > 0) {
                    $this->log('warning', 'Scenario generation required retries', [
                        'game_id' => $game->id,
                        'retries' => $metrics['retries'],
                        'phase1_sec' => $metrics['phase1_sec'],
                    ]);
                }
            }

            $this->log('info', 'Game started', $logContext);

            return response()->json([
                'game_id' => $game->id,
                'scenario_name' => $gameInfo['scenario_name'],
                'setting' => $gameInfo['setting'],
                'victim' => $gameInfo['victim'],
                'location' => $gameInfo['location'] ?? 'Unknown Location',
                'time_of_incident' => $gameInfo['time_of_incident'] ?? 'Time unknown',
                'timeline' => $gameInfo['timeline'] ?? '',
                'personas' => $gameInfo['personas'],
                'intro_message' => $gameInfo['intro_message'],
                'crime_scene_images' => $scenarioResult['crime_scene_images'] ?? [],
            ]);
        } catch (\Exception $e) {
            $duration = round(microtime(true) - $startTime, 2);

            $this->log('error', 'Game generation failed', [
                'game_id' => $game->id,
                'error' => $e->getMessage(),
                'duration_sec' => $duration,
            ]);

            // Cleanup on failure
            $game->delete();

            return response()->json([
                'error' => 'Scenario generation failed',
                'details' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    public function quickStart(Request $request): JsonResponse
    {
        // Create game entry first
        $game = Game::create([
            'user_id' => $request->user()?->id,
            'scenario_slug' => 'default_villa_sonnenhof',
            'status' => 'active',
            'revealed_clues' => [],
            'expires_at' => now()->addMinutes(60),
        ]);

        $this->log('info', 'Game created', [
            'game_id' => $game->id,
            'type' => 'quick_start',
        ]);

        try {
            // Load default scenario instantly (no AI generation)
            $gameInfo = $this->aiService->quickStartScenario($game->id);

            $this->log('info', 'Game started', [
                'game_id' => $game->id,
                'scenario' => $gameInfo['scenario_name'] ?? 'default',
            ]);

            return response()->json([
                'game_id' => $game->id,
                'scenario_name' => $gameInfo['scenario_name'],
                'setting' => $gameInfo['setting'],
                'victim' => $gameInfo['victim'],
                'location' => $gameInfo['location'] ?? 'Unknown Location',
                'time_of_incident' => $gameInfo['time_of_incident'] ?? 'Time unknown',
                'timeline' => $gameInfo['timeline'] ?? '',
                'personas' => $gameInfo['personas'],
                'intro_message' => $gameInfo['intro_message'],
                'crime_scene_images' => $gameInfo['crime_scene_images'] ?? [],
            ]);
        } catch (\Exception $e) {
            $this->log('error', 'Quick start failed', [
                'game_id' => $game->id,
                'error' => $e->getMessage(),
            ]);

            // Cleanup on failure
            $game->delete();

            return response()->json([
                'error' => 'Failed to load default scenario',
                'details' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Start a new game
     */
    public function start(Request $request): JsonResponse
    {
        $game = Game::create([
            'user_id' => $request->user()?->id,
            'scenario_slug' => 'office_murder',
            'status' => 'active',
            'revealed_clues' => [],
        ]);

        $this->log('info', 'Game created', [
            'game_id' => $game->id,
            'type' => 'legacy_start',
        ]);

        try {
            $gameInfo = $this->aiService->startGame($game->id);

            $this->log('info', 'Game started', [
                'game_id' => $game->id,
                'scenario' => $gameInfo['scenario_name'] ?? 'office_murder',
            ]);
        } catch (\Exception $e) {
            $this->log('warning', 'AI service unavailable, using fallback', [
                'game_id' => $game->id,
                'error' => $e->getMessage(),
            ]);

            // AI service might not be running, return basic info
            $gameInfo = $this->getFallbackGameInfo($game->id);
        }

        return response()->json([
            'game_id' => $game->id,
            'scenario_name' => $gameInfo['scenario_name'] ?? 'Der Fall InnoTech',
            'setting' => $gameInfo['setting'] ?? '',
            'victim' => $gameInfo['victim'] ?? 'Marcus Weber (CFO)',
            'personas' => $gameInfo['personas'] ?? $this->getPersonas(),
            'intro_message' => $gameInfo['intro_message'] ?? $this->getDefaultIntro(),
        ]);
    }

    /**
     * Send a chat message
     */
    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'game_id' => 'required|uuid|exists:games,id',
            'persona_slug' => 'required|string',
            'message' => 'required|string|max:1000',
        ]);

        $game = Game::findOrFail($validated['game_id']);

        if (! $game->isActive()) {
            $this->log('warning', 'Chat attempted on inactive game', [
                'game_id' => $game->id,
                'status' => $game->status,
            ]);

            return response()->json([
                'error' => 'Game is not active',
            ], 400);
        }

        // Save user message
        ChatMessage::create([
            'game_id' => $game->id,
            'persona_slug' => null,
            'content' => $validated['message'],
        ]);

        // Get chat history for this persona
        $chatHistory = $game->messages()
            ->where(function ($query) use ($validated) {
                $query->whereNull('persona_slug')
                    ->orWhere('persona_slug', $validated['persona_slug']);
            })
            ->get()
            ->map(fn (ChatMessage $msg) => [
                'role' => $msg->isUserMessage() ? 'user' : 'assistant',
                'content' => $msg->content,
            ])
            ->toArray();

        try {
            $response = $this->aiService->chat(
                $game->id,
                $validated['persona_slug'],
                $validated['message'],
                $chatHistory
            );

            // Save persona response
            $chatMessage = ChatMessage::create([
                'game_id' => $game->id,
                'persona_slug' => $validated['persona_slug'],
                'content' => $response['response'],
                'revealed_clue' => $response['revealed_clue'] ?? null,
            ]);

            // Update revealed clues
            if (! empty($response['revealed_clue'])) {
                $clues = $game->revealed_clues ?? [];
                $clues[] = $response['revealed_clue'];
                $game->update(['revealed_clues' => array_unique($clues)]);

                $this->log('info', 'Clue revealed', [
                    'game_id' => $game->id,
                    'persona' => $validated['persona_slug'],
                    'total_clues' => count($clues),
                ]);
            }

            // Update auto_notes (grouped by persona)
            $newAutoNotes = $response['new_auto_notes'] ?? [];
            $allAutoNotes = $response['all_auto_notes'] ?? [];

            // DEBUG: Log the auto notes from AI service response
            $this->log('debug', 'Auto notes from AI service', [
                'game_id' => $game->id,
                'new_auto_notes_count' => count($newAutoNotes),
                'all_auto_notes_keys' => array_keys($allAutoNotes),
                'all_auto_notes_sample' => json_encode(array_slice($allAutoNotes, 0, 1)),
            ]);

            if (! empty($allAutoNotes)) {
                $game->update(['auto_notes' => $allAutoNotes]);

                $this->log('info', 'Auto notes updated', [
                    'game_id' => $game->id,
                    'persona' => $validated['persona_slug'],
                    'new_notes_count' => count($newAutoNotes),
                ]);
            }

            return response()->json([
                'persona_slug' => $response['persona_slug'],
                'persona_name' => $response['persona_name'],
                'response' => $response['response'],
                'revealed_clue' => $response['revealed_clue'] ?? null,
                'new_auto_notes' => $newAutoNotes,
                'all_auto_notes' => $allAutoNotes,
                'audio_base64' => $response['audio_base64'] ?? null,
                'voice_id' => $response['voice_id'] ?? null,
            ]);
        } catch (\Exception $e) {
            $this->log('error', 'Chat failed', [
                'game_id' => $game->id,
                'persona' => $validated['persona_slug'],
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'AI Service unavailable. Please try again later.',
                'details' => config('app.debug') ? $e->getMessage() : null,
            ], 503);
        }
    }

    /**
     * Get chat history for a game
     */
    public function history(string $gameId): JsonResponse
    {
        $game = Game::with('messages')->findOrFail($gameId);

        return response()->json([
            'game_id' => $game->id,
            'status' => $game->status,
            'revealed_clues' => $game->revealed_clues ?? [],
            'messages' => $game->messages->map(fn (ChatMessage $msg) => [
                'id' => $msg->id,
                'persona_slug' => $msg->persona_slug,
                'content' => $msg->content,
                'is_user' => $msg->isUserMessage(),
                'created_at' => $msg->created_at->toIso8601String(),
            ]),
        ]);
    }

    /**
     * Accuse a persona
     */
    public function accuse(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'game_id' => 'required|uuid|exists:games,id',
            'accused_persona' => 'required|string',
        ]);

        $game = Game::findOrFail($validated['game_id']);

        if (! $game->isActive()) {
            $this->log('warning', 'Accusation on inactive game', [
                'game_id' => $game->id,
                'status' => $game->status,
            ]);

            return response()->json(['error' => 'Game is not active'], 400);
        }

        // Get the solution from AI service
        $solution = $this->aiService->getSolution($game->id);
        $murdererSlug = $solution['murderer']['slug'] ?? 'tom'; // Fallback for old scenarios
        
        $correct = $validated['accused_persona'] === $murdererSlug;
        $game->solve($validated['accused_persona'], $correct);

        $this->log('info', 'Game accusation', [
            'game_id' => $game->id,
            'accused' => $validated['accused_persona'],
            'correct' => $correct,
            'actual_murderer' => $murdererSlug,
            'clues_revealed' => count($game->revealed_clues ?? []),
        ]);

        $result = [
            'correct' => $correct,
            'message' => $correct
                ? 'Correct! You have solved the case!'
                : 'Wrong! That was not the murderer.',
            'solution' => [
                'murderer' => $solution['murderer'] ?? null,
                'motive' => $solution['motive'] ?? null,
                'weapon' => $solution['weapon'] ?? null,
                'critical_clues' => $solution['critical_clues'] ?? [],
            ],
        ];

        // Cleanup: Delete game and messages if solved
        if ($correct) {
            $game->messages()->delete();
            $game->delete();

            $this->log('info', 'Game completed and cleaned up', [
                'game_id' => $validated['game_id'],
            ]);
        }

        return response()->json($result);
    }

    /**
     * Get a hint from the GameMaster
     */
    public function getHint(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'game_id' => 'required|uuid|exists:games,id',
        ]);

        $game = Game::findOrFail($validated['game_id']);

        if (! $game->isActive()) {
            return response()->json(['error' => 'Game is not active'], 400);
        }

        $this->log('info', 'Hint requested', [
            'game_id' => $game->id,
        ]);

        try {
            $hintResult = $this->aiService->getHint($game->id);

            $this->log('info', 'Hint generated', [
                'game_id' => $game->id,
                'hints_used' => $hintResult['hints_used'] ?? 0,
            ]);

            return response()->json($hintResult);
        } catch (\Exception $e) {
            $this->log('error', 'Hint generation failed', [
                'game_id' => $game->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Failed to generate hint',
                'details' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get personas list
     */
    private function getPersonas(): array
    {
        return [
            [
                'slug' => 'elena',
                'name' => 'Elena Schmidt',
                'role' => 'CEO',
                'description' => 'Die Gründerin und CEO von InnoTech. Professionell, ehrgeizig, kontrolliert.',
                'emoji' => '🏢',
                'image' => 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces&q=80',
            ],
            [
                'slug' => 'tom',
                'name' => 'Tom Berger',
                'role' => 'Lead Developer',
                'description' => 'Der technische Kopf des Startups. Introvertiert, brillant, manchmal nervös.',
                'emoji' => '💻',
                'image' => 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces&q=80',
            ],
            [
                'slug' => 'lisa',
                'name' => 'Lisa Hoffmann',
                'role' => 'Executive Assistant',
                'description' => 'Die langjährige Assistentin. Loyal, aufmerksam, diskret.',
                'emoji' => '📋',
                'image' => 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces&q=80',
            ],
            [
                'slug' => 'klaus',
                'name' => 'Klaus Müller',
                'role' => 'Facility Manager',
                'description' => 'Der erfahrene Hausmeister. Ruhig, beobachtend, kennt alle Ecken.',
                'emoji' => '🔧',
                'image' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces&q=80',
            ],
        ];
    }

    private function getDefaultIntro(): string
    {
        return 'Willkommen beim Fall "InnoTech". Marcus Weber, CFO der InnoTech GmbH, wurde tot aufgefunden. Befrage die Verdächtigen und löse den Fall!';
    }

    private function getFallbackGameInfo(string $gameId): array
    {
        return [
            'game_id' => $gameId,
            'scenario_name' => 'Der Fall InnoTech',
            'setting' => 'Die InnoTech GmbH ist ein aufstrebendes Tech-Startup in München.',
            'victim' => 'Marcus Weber (CFO)',
            'personas' => $this->getPersonas(),
            'intro_message' => $this->getDefaultIntro(),
        ];
    }
}
