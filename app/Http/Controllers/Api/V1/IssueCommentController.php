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
    public function __construct(
        private readonly FindIssue $findIssue,
        private readonly AddCommentToIssue $addComment,
        private readonly ListIssueComments $listComments,
    ) {}

    public function store(StoreCommentRequest $request, string $issue): JsonResponse
    {
        $model = $this->findIssue->handle($issue);
        Gate::authorize('update', $model);

        $comment = $this->addComment->handle($request->user(), array_merge(
            $request->validated(),
            ['issue_id' => $issue],
        ));

        return IssueCommentResource::make($comment)->response()->setStatusCode(201);
    }

    public function index(Request $request, string $issue): JsonResponse
    {
        $model = $this->findIssue->handle($issue);
        Gate::authorize('view', $model);

        $limit = min(max((int) $request->query('limit', '25'), 1), 100);
        $page = $this->listComments->handle($issue, $limit);

        return IssueCommentResource::collection($page)->response();
    }
}
