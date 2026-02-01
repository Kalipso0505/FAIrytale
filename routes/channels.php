<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Public game channel for generation progress (no auth needed)
// The game.{gameId} channel is a public channel defined in the Event class
