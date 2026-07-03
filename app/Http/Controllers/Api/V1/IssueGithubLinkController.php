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
    public function __construct(
        private readonly FindIssue $findIssue,
        private readonly AddGithubLink $addLink,
        private readonly ListGithubLinks $listLinks,
        private readonly RemoveGithubLink $removeLink,
    ) {}

    public function index(Request $request, string $issue): JsonResponse
    {
        $model = $this->findIssue->handle($issue);
        Gate::authorize('view', $model);

        return GithubLinkResource::collection($this->listLinks->handle($request->user(), $issue))->response();
    }

    public function store(StoreGithubLinkRequest $request, string $issue): JsonResponse
    {
        $model = $this->findIssue->handle($issue);
        Gate::authorize('update', $model);

        $link = $this->addLink->handle($request->user(), $issue, $request->validated('url'));

        return GithubLinkResource::make($link)->response()->setStatusCode(201);
    }

    public function destroy(Request $request, string $issue, string $link): Response
    {
        $model = $this->findIssue->handle($issue);
        Gate::authorize('update', $model);

        $this->removeLink->handle($request->user(), $issue, $link);

        return response()->noContent();
    }
}
