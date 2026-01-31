<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PromptTemplate extends Model
{
    protected $fillable = [
        'key',
        'name',
        'body',
    ];

    /**
     * Find a prompt template by its key
     */
    public static function findByKey(string $key): ?self
    {
        return self::where('key', $key)->first();
    }

    /**
     * Get all prompt templates as key => body array
     */
    public static function getAllAsArray(): array
    {
        return self::pluck('body', 'key')->toArray();
    }
}
