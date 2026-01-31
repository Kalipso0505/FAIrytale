<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule: Cleanup expired games every 5 minutes
Schedule::command('games:cleanup-expired')
    ->everyFiveMinutes()
    ->runInBackground();
