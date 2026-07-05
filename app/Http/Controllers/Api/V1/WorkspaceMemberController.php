<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\WorkspaceMemberResource;
use App\UseCases\Members\FindMember;
use App\UseCases\Members\ListWorkspaceMembers;
use App\UseCases\Members\UpdateMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

final class WorkspaceMemberController extends Controller
{
    public function __construct(
        private readonly ListWorkspaceMembers $listWorkspaceMembers,
        private readonly FindMember $findMember,
        private readonly UpdateMember $updateMember,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $result = $this->listWorkspaceMembers->handle($request->user());

        $rows = collect()
            ->concat($result['members'])
            ->concat($result['invitations'])
            ->map(fn ($model) => (new WorkspaceMemberResource($model))->toArray($request))
            ->values();

        return response()->json(['data' => $rows]);
    }

    public function update(Request $request, string $user): JsonResponse
    {
        $model = $this->findMember->handle($user);

        Gate::authorize('update', $model);

        $data = $request->validate([
            'admin_level'  => ['sometimes', 'string', 'in:owner,admin,member,viewer'],
            'is_developer' => ['sometimes', 'boolean'],
            'is_agent'     => ['sometimes', 'boolean'],
        ]);

        $updated = $this->updateMember->handle($request->user(), $model, $data);

        return response()->json(['data' => (new WorkspaceMemberResource($updated))->toArray($request)]);
    }
}
