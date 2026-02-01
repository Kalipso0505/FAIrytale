<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ScenarioGenerationProgress implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Progress stages for scenario generation.
     */
    public const STAGE_STARTED = 'started';

    public const STAGE_GENERATING_SCENARIO = 'generating_scenario';

    public const STAGE_SCENARIO_COMPLETE = 'scenario_complete';

    public const STAGE_GENERATING_PERSONAS = 'generating_personas';

    public const STAGE_PERSONA_COMPLETE = 'persona_complete';

    public const STAGE_GENERATING_IMAGES = 'generating_images';

    public const STAGE_INITIALIZING_GAME = 'initializing_game';

    public const STAGE_COMPLETE = 'complete';

    public const STAGE_ERROR = 'error';

    public function __construct(
        public string $gameId,
        public string $stage,
        public int $progress,
        public string $message,
        public ?string $personaName = null,
        public ?int $personaIndex = null,
        public ?int $totalPersonas = null,
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('game.'.$this->gameId),
        ];
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'game_id' => $this->gameId,
            'stage' => $this->stage,
            'progress' => $this->progress,
            'message' => $this->message,
            'persona_name' => $this->personaName,
            'persona_index' => $this->personaIndex,
            'total_personas' => $this->totalPersonas,
            'timestamp' => now()->toIso8601String(),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'generation.progress';
    }
}
