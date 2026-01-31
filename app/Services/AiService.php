<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class AiService
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = config('services.ai.url', 'http://ai-service:8000');
    }

    /**
     * Check if the AI service is available
     */
    public function isHealthy(): bool
    {
        try {
            $response = Http::timeout(5)->get("{$this->baseUrl}/health");

            return $response->ok() && $response->json('status') === 'healthy';
        } catch (ConnectionException) {
            return false;
        }
    }

    /**
     * Generate a new scenario
     */
    public function generateScenario(string $gameId, string $userInput = '', string $difficulty = 'mittel'): array
    {
        $response = Http::timeout(120) // Längerer Timeout für AI-Generierung
            ->post("{$this->baseUrl}/scenario/generate", [
                'game_id' => $gameId,
                'user_input' => $userInput,
                'difficulty' => $difficulty,
            ]);

        if (! $response->ok()) {
            throw new RuntimeException('Failed to generate scenario: '.$response->body());
        }

        return $response->json();
    }

    /**
     * Start a new game session
     */
    public function startGame(string $gameId): array
    {
        $response = Http::timeout(30)
            ->post("{$this->baseUrl}/game/start", [
                'game_id' => $gameId,
            ]);

        if (! $response->ok()) {
            throw new RuntimeException('Failed to start game: '.$response->body());
        }

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
        $response = Http::timeout(60)
            ->post("{$this->baseUrl}/chat", [
                'game_id' => $gameId,
                'persona_slug' => $personaSlug,
                'message' => $message,
                'chat_history' => $chatHistory,
            ]);

        if (! $response->ok()) {
            throw new RuntimeException('Failed to chat: '.$response->body());
        }

        return $response->json();
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
            throw new RuntimeException('Failed to get personas: '.$response->body());
        }

        return $response->json('personas', []);
    }
}
