<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\UseCases\Issues\FindIssue;
use App\UseCases\Issues\StarIssue;
use App\UseCases\Issues\UnstarIssue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/** PUT / DELETE /v1/issues/{issue}/star — the caller's personal star (PRD §3.2.9). Anyone who can view the issue. */
final class IssueStarController extends Controller
{
    public function star(Request $request, string $issue): JsonResponse
    {
        $model = FindIssue::run($issue);
        Gate::authorize('view', $model);

        $starredAt = StarIssue::run($request->user(), $model);

        return response()->json(['data' => [
            'issue_id' => $model->id,
            'starred' => true,
            'starred_at' => $starredAt->toISOString(),
        ]]);
    }

    public function unstar(Request $request, string $issue): JsonResponse
    {
        $model = FindIssue::run($issue);
        Gate::authorize('view', $model);

        UnstarIssue::run($request->user(), $model);

        return response()->json(['data' => [
            'issue_id' => $model->id,
            'starred' => false,
            'starred_at' => null,
        ]]);
    }
}
