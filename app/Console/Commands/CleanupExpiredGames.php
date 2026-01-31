<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Game;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CleanupExpiredGames extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'games:cleanup-expired';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Delete expired games and their chat messages';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $expiredGames = Game::where('expires_at', '<=', now())->get();

        if ($expiredGames->isEmpty()) {
            $this->info('No expired games found.');

            return self::SUCCESS;
        }

        $count = $expiredGames->count();
        $totalMessages = 0;

        foreach ($expiredGames as $game) {
            $messageCount = $game->messages()->count();
            $totalMessages += $messageCount;

            // Delete all chat messages
            $game->messages()->delete();

            // Delete the game
            $game->delete();
        }

        Log::channel('game')->info('Expired games cleaned up', [
            'games_deleted' => $count,
            'messages_deleted' => $totalMessages,
        ]);

        $this->info("Deleted {$count} expired game(s) with {$totalMessages} message(s).");

        return self::SUCCESS;
    }
}
