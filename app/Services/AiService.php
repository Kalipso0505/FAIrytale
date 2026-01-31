<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class AiService
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = config('services.ai.url', 'http://ai-service:8000');
    }

    private function log(string $level, string $message, array $context = []): void
    {
        Log::channel('ai')->{$level}($message, $context);
    }

    /**
     * Check if the AI service is available
     */
    public function isHealthy(): bool
    {
        try {
            $response = Http::timeout(5)->get("{$this->baseUrl}/health");
            $healthy = $response->ok() && $response->json('status') === 'healthy';

            if (! $healthy) {
                $this->log('warning', 'AI service unhealthy', [
                    'status_code' => $response->status(),
                ]);
            }

            return $healthy;
        } catch (ConnectionException $e) {
            $this->log('error', 'AI service connection failed', [
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Generate a new scenario
     */
    public function generateScenario(string $gameId, string $userInput = '', string $difficulty = 'mittel'): array
    {
        $this->log('info', 'Generating scenario', [
            'game_id' => $gameId,
            'difficulty' => $difficulty,
            'has_user_input' => $userInput !== '',
        ]);

        $startTime = microtime(true);

        $response = Http::timeout(120) // Längerer Timeout für AI-Generierung
            ->post("{$this->baseUrl}/scenario/generate", [
                'game_id' => $gameId,
                'user_input' => $userInput,
                'difficulty' => $difficulty,
            ]);

        $duration = round((microtime(true) - $startTime) * 1000);

        if (! $response->ok()) {
            $this->log('error', 'Scenario generation failed', [
                'game_id' => $gameId,
                'status_code' => $response->status(),
                'duration_ms' => $duration,
            ]);
            throw new RuntimeException('Failed to generate scenario: '.$response->body());
        }

        $this->log('info', 'Scenario generated', [
            'game_id' => $gameId,
            'duration_ms' => $duration,
        ]);

        return $response->json();
    }

    /**
     * Quick start with default pre-made scenario (no AI generation)
     */
    public function quickStartScenario(string $gameId): array
    {
        $this->log('info', 'Quick start scenario', ['game_id' => $gameId]);

        $response = Http::timeout(10) // Quick, no AI generation
            ->post("{$this->baseUrl}/scenario/quick-start", [
                'game_id' => $gameId,
            ]);

        if (! $response->ok()) {
            $this->log('error', 'Quick start failed', [
                'game_id' => $gameId,
                'status_code' => $response->status(),
            ]);
            throw new RuntimeException('Failed to load default scenario: '.$response->body());
        }

        return $response->json();
    }

    /**
     * Start a new game session
     */
    public function startGame(string $gameId): array
    {
        $this->log('info', 'Starting game session', ['game_id' => $gameId]);

        $response = Http::timeout(30)
            ->post("{$this->baseUrl}/game/start", [
                'game_id' => $gameId,
            ]);

        if (! $response->ok()) {
            $this->log('error', 'Game start failed', [
                'game_id' => $gameId,
                'status_code' => $response->status(),
            ]);
            throw new RuntimeException('Failed to start game: '.$response->body());
        }

        $this->log('info', 'Game session started', ['game_id' => $gameId]);

        return $response->json();
    }

    /**
     * Send a chat message to a persona
     *
     * @param  array<int, array{role: string, content: string}>  $chatHistory
     */
    public function chat(
        string $gameId,
        string $personaSlug,
        string $message,
        array $chatHistory = []
    ): array {
        $this->log('debug', 'Chat request', [
            'game_id' => $gameId,
            'persona' => $personaSlug,
            'history_count' => count($chatHistory),
        ]);

        $startTime = microtime(true);

        $response = Http::timeout(60)
            ->post("{$this->baseUrl}/chat", [
                'game_id' => $gameId,
                'persona_slug' => $personaSlug,
                'message' => $message,
                'chat_history' => $chatHistory,
            ]);

        $duration = round((microtime(true) - $startTime) * 1000);

        if (! $response->ok()) {
            $this->log('error', 'Chat request failed', [
                'game_id' => $gameId,
                'persona' => $personaSlug,
                'status_code' => $response->status(),
                'duration_ms' => $duration,
            ]);
            throw new RuntimeException('Failed to chat: '.$response->body());
        }

        $result = $response->json();

        $this->log('debug', 'Chat response', [
            'game_id' => $gameId,
            'persona' => $personaSlug,
            'duration_ms' => $duration,
            'revealed_clue' => ! empty($result['revealed_clue']),
        ]);

        return $result;
    }

    /**
     * Get available personas for a specific game
     */
    public function getPersonas(string $gameId): array
    {
        $response = Http::timeout(10)->get("{$this->baseUrl}/personas", [
            'game_id' => $gameId,
        ]);

        if (! $response->ok()) {
            $this->log('error', 'Get personas failed', [
                'game_id' => $gameId,
                'status_code' => $response->status(),
            ]);
            throw new RuntimeException('Failed to get personas: '.$response->body());
        }

        $personas = $response->json('personas', []);

        $this->log('debug', 'Personas retrieved', [
            'game_id' => $gameId,
            'count' => count($personas),
        ]);

        return $personas;
    }
}
