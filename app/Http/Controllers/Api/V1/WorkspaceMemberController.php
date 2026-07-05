<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\WorkspaceMemberResource;
use App\UseCases\Members\ListWorkspaceMembers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class WorkspaceMemberController extends Controller
{
    public function __construct(private readonly ListWorkspaceMembers $listWorkspaceMembers) {}

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
}
