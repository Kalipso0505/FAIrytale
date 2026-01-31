<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Game extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'scenario_slug',
        'status',
        'revealed_clues',
        'game_state',
        'accused_persona',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'revealed_clues' => 'array',
            'game_state' => 'array',
            'expires_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class)->orderBy('created_at');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isExpired(): bool
    {
        return $this->expires_at && now()->isAfter($this->expires_at);
    }

    public function solve(string $accusedPersona, bool $correct): void
    {
        $this->update([
            'status' => $correct ? 'solved' : 'failed',
            'accused_persona' => $accusedPersona,
        ]);
    }
}
