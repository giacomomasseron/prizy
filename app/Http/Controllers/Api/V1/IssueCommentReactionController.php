<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ReactionRequest;
use App\Http\Resources\IssueCommentResource;
use App\UseCases\Issues\FindIssue;
use App\UseCases\Issues\ToggleIssueCommentReaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

final class IssueCommentReactionController extends Controller
{
    public function toggle(ReactionRequest $request, string $issue, string $comment): JsonResponse
    {
        $model = FindIssue::run($issue);
        Gate::authorize('view', $model);

        $updated = ToggleIssueCommentReaction::run($request->user(), $model, $comment, $request->validated()['emoji']);

        return IssueCommentResource::make($updated)->response();
    }
}
