<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Events\ScenarioGenerationProgress;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Internal endpoint for receiving progress updates from AI service.
 * Broadcasts progress events via WebSocket to frontend.
 */
class InternalProgressController extends Controller
{
    /**
     * Receive and broadcast progress updates from AI service
     */
    public function broadcast(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'game_id' => 'required|string|uuid',
            'stage' => 'required|string|in:started,generating_scenario,scenario_complete,generating_personas,persona_complete,generating_images,initializing_game,complete,error',
            'progress' => 'required|integer|min:0|max:100',
            'message' => 'required|string|max:500',
            'persona_name' => 'nullable|string|max:100',
            'persona_index' => 'nullable|integer|min:0',
            'total_personas' => 'nullable|integer|min:1',
        ]);

        // Broadcast the event (ShouldBroadcastNow = immediate, no queue)
        event(new ScenarioGenerationProgress(
            $validated['game_id'],
            $validated['stage'],
            (int) $validated['progress'],
            $validated['message'],
            $validated['persona_name'] ?? null,
            isset($validated['persona_index']) ? (int) $validated['persona_index'] : null,
            isset($validated['total_personas']) ? (int) $validated['total_personas'] : null,
        ));

        return response()->json(['ok' => true]);
    }
}
