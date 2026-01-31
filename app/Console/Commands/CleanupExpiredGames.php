<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Game;
use Illuminate\Console\Command;

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

        foreach ($expiredGames as $game) {
            // Delete all chat messages
            $game->messages()->delete();

            // Delete the game
            $game->delete();
        }

        $this->info("Deleted {$count} expired game(s).");

        return self::SUCCESS;
    }
}
