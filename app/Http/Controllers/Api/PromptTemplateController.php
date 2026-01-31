<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PromptTemplate;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\JsonResponse;

/**
 * API-Endpunkte für Prompt-Templates (AI-Service intern)
 */
#[Group('AI-Service (intern)')]
class PromptTemplateController extends Controller
{
    /**
     * Alle Prompt-Templates auflisten
     *
     * Gibt alle verfügbaren Prompt-Templates mit Key, Name und Body zurück.
     *
     * @operationId listPromptTemplates
     */
    public function index(): JsonResponse
    {
        $templates = PromptTemplate::all(['key', 'name', 'body', 'updated_at']);

        return response()->json([
            'prompts' => $templates,
        ]);
    }

    /**
     * Einzelnes Prompt-Template abrufen
     *
     * Gibt ein Prompt-Template anhand seines eindeutigen Keys zurück.
     *
     * @operationId getPromptTemplate
     */
    public function show(string $key): JsonResponse
    {
        $template = PromptTemplate::findByKey($key);

        if (! $template) {
            return response()->json([
                'error' => 'Prompt template not found',
                'key' => $key,
            ], 404);
        }

        return response()->json([
            'key' => $template->key,
            'name' => $template->name,
            'body' => $template->body,
            'updated_at' => $template->updated_at,
        ]);
    }

    /**
     * Alle Prompts als Key-Body-Map
     *
     * Optimierter Endpunkt für den AI-Service. Gibt alle Prompts
     * als einfaches Key→Body Dictionary zurück.
     *
     * @operationId getAllPromptsMap
     */
    public function all(): JsonResponse
    {
        return response()->json(PromptTemplate::getAllAsArray());
    }
}
