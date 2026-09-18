<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\UseCases\Workspace\ShowWorkspaceModules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Returns the authenticated user for the current workspace.
 *
 * Guarded by auth:token,web — a valid Bearer token OR an authenticated
 * session cookie grants access.
 */
final class MeController extends Controller
{
    public function __construct(private readonly ShowWorkspaceModules $showWorkspaceModules) {}

    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'data' => $user->only([
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
                'email_digest_frequency',
                'created_at',
            ]) + [
                // Module switches the SPA needs before it renders navigation.
                'workspace' => $this->showWorkspaceModules->handle($user),
            ],
        ]);
    }
}
