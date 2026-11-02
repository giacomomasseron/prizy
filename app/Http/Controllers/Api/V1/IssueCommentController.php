<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreCommentRequest;
use App\Http\Resources\IssueCommentResource;
use App\UseCases\Issues\AddCommentToIssue;
use App\UseCases\Issues\FindIssue;
use App\UseCases\Issues\ListIssueComments;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

final class IssueCommentController extends Controller
{
    public function store(StoreCommentRequest $request, string $issue): JsonResponse
    {
        $model = FindIssue::run($issue);
        Gate::authorize('view', $model);

        $comment = AddCommentToIssue::run($request->user(), array_merge(
            $request->validated(),
            ['issue_id' => $issue],
        ));

        return IssueCommentResource::make($comment)->response()->setStatusCode(201);
    }

    public function index(Request $request, string $issue): JsonResponse
    {
        $model = FindIssue::run($issue);
        Gate::authorize('view', $model);

        $limit = min(max((int) $request->query('limit', '25'), 1), 100);
        $page = ListIssueComments::run($issue, $limit);

        return IssueCommentResource::collection($page)->response();
    }
}
