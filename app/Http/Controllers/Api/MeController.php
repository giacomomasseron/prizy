<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Returns the authenticated user for the current workspace.
 *
 * Guarded by auth:token — only a valid Bearer token grants access.
 */
final class MeController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $request->user()->only([
                'id',
                'workspace_id',
                'name',
                'email',
                'admin_level',
                'is_developer',
                'is_agent',
                'timezone',
                'locale',
                'email_verified_at',
                'last_seen_at',
                'created_at',
            ]),
        ]);
    }
}
