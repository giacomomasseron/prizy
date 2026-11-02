<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreGithubLinkRequest;
use App\Http\Resources\GithubLinkResource;
use App\UseCases\Issues\AddGithubLink;
use App\UseCases\Issues\FindIssue;
use App\UseCases\Issues\ListGithubLinks;
use App\UseCases\Issues\RemoveGithubLink;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

final class IssueGithubLinkController extends Controller
{
    public function index(Request $request, string $issue): JsonResponse
    {
        $model = FindIssue::run($issue);
        Gate::authorize('view', $model);

        return GithubLinkResource::collection(ListGithubLinks::run($request->user(), $issue))->response();
    }

    public function store(StoreGithubLinkRequest $request, string $issue): JsonResponse
    {
        $model = FindIssue::run($issue);
        Gate::authorize('update', $model);

        $link = AddGithubLink::run($request->user(), $issue, $request->validated('url'));

        return GithubLinkResource::make($link)->response()->setStatusCode(201);
    }

    public function destroy(Request $request, string $issue, string $link): Response
    {
        $model = FindIssue::run($issue);
        Gate::authorize('update', $model);

        RemoveGithubLink::run($request->user(), $issue, $link);

        return response()->noContent();
    }
}
