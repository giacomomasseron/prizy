<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\UseCases\Workspace\DeleteWorkspace;
use App\UseCases\Workspace\ShowWorkspace;
use App\UseCases\Workspace\UpdateWorkspaceSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class WorkspaceController extends Controller
{
    public function __construct(
        private readonly UpdateWorkspaceSettings $updateWorkspaceSettings,
        private readonly ShowWorkspace $showWorkspace,
        private readonly DeleteWorkspace $deleteWorkspace,
    ) {}

    public function show(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->showWorkspace->handle($request->user())]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'helpdesk_enabled' => ['required', 'boolean'],
        ]);

        $workspace = $this->updateWorkspaceSettings->handle($request->user(), $data);

        return response()->json(['data' => [
            'id'               => $workspace->id,
            'name'             => $workspace->name,
            'slug'             => $workspace->slug,
            'helpdesk_enabled' => $workspace->helpdesk_enabled,
        ]]);
    }

    /**
     * The typed name is checked in the use case, after the owner check, so a
     * non-owner is refused whatever they sent. The workspace and the caller's
     * session end together: invalidating the session signs the caller out
     * without touching their user row, which the queued erasing removes.
     */
    public function destroy(Request $request): Response
    {
        $confirm = $request->input('confirm');

        $this->deleteWorkspace->handle($request->user(), is_string($confirm) ? $confirm : '');

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }
}
