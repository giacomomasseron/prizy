<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\UseCases\Workspace\UpdateWorkspaceSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class WorkspaceController extends Controller
{
    public function __construct(private readonly UpdateWorkspaceSettings $updateWorkspaceSettings) {}

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
}
