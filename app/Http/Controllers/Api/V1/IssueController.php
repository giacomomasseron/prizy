<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ListIssuesRequest;
use App\Http\Resources\IssueResource;
use App\UseCases\Issues\FindIssue;
use App\UseCases\Issues\ListIssues;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

final class IssueController extends Controller
{
    public function __construct(
        private readonly ListIssues $listIssues,
        private readonly FindIssue $findIssue,
    ) {}

    public function index(ListIssuesRequest $request): JsonResponse
    {
        $page = $this->listIssues->handle($request->filters(), $request->sorts(), $request->limit());

        return IssueResource::collection($page)->response();
    }

    public function show(Request $request, string $issue): JsonResponse
    {
        $model = $this->findIssue->handle($issue);
        Gate::authorize('view', $model);

        return IssueResource::make($model)->response();
    }
}
