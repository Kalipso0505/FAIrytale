<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Internal endpoint for receiving logs from AI service
 */
class InternalLogController extends Controller
{
    /**
     * Receive log entries from AI service
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            "level" => "required|in:debug,info,warning,error",
            "message" => "required|string|max:1000",
            "context" => "nullable|array",
        ]);

        $context = $validated["context"] ?? [];
        $context["source"] = "ai-service";

        Log::channel("game")->log(
            $validated["level"],
            $validated["message"],
            $context
        );

        return response()->json(["ok" => true]);
    }
}
