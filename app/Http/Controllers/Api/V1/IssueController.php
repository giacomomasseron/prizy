<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\AssignIssueRequest;
use App\Http\Requests\Api\V1\ListIssuesRequest;
use App\Http\Requests\Api\V1\StoreIssueRequest;
use App\Http\Requests\Api\V1\TransitionStatusRequest;
use App\Http\Requests\Api\V1\UpdateIssueRequest;
use App\Http\Resources\IssueResource;
use App\UseCases\Issues\ArchiveIssue;
use App\UseCases\Issues\AssignIssue;
use App\UseCases\Issues\CreateIssue;
use App\UseCases\Issues\FindIssue;
use App\UseCases\Issues\ListIssues;
use App\UseCases\Issues\TransitionIssueStatus;
use App\UseCases\Issues\UpdateIssue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

final class IssueController extends Controller
{
    public function __construct(
        private readonly ListIssues $listIssues,
        private readonly FindIssue $findIssue,
        private readonly CreateIssue $createIssue,
        private readonly UpdateIssue $updateIssue,
        private readonly TransitionIssueStatus $transitionStatus,
        private readonly AssignIssue $assignIssue,
        private readonly ArchiveIssue $archiveIssue,
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
        $model->load(['assignee', 'project', 'cycle', 'supportTickets.requester.contactMetadata']);

        return IssueResource::make($model)->response();
    }

    public function store(StoreIssueRequest $request): JsonResponse
    {
        $issue = $this->createIssue->handle($request->user(), $request->validated());

        return IssueResource::make($issue)->response()->setStatusCode(201);
    }

    public function update(UpdateIssueRequest $request, string $issue): JsonResponse
    {
        $model = $this->findIssue->handle($issue);
        Gate::authorize('update', $model);

        $updated = $this->updateIssue->handle($request->user(), array_merge(
            $request->validated(),
            ['issue_id' => $issue],
        ));

        return IssueResource::make($updated)->response();
    }

    public function status(TransitionStatusRequest $request, string $issue): JsonResponse
    {
        $model = $this->findIssue->handle($issue);
        Gate::authorize('update', $model);

        $updated = $this->transitionStatus->handle($request->user(), [
            'issue_id' => $issue,
            'status' => $request->validated('status'),
        ]);

        return IssueResource::make($updated)->response();
    }

    public function assignee(AssignIssueRequest $request, string $issue): JsonResponse
    {
        $model = $this->findIssue->handle($issue);
        Gate::authorize('update', $model);

        $updated = $this->assignIssue->handle($request->user(), [
            'issue_id' => $issue,
            'assignee_id' => $request->validated('assignee_id'),
        ]);

        return IssueResource::make($updated)->response();
    }

    public function archive(Request $request, string $issue): JsonResponse
    {
        $model = $this->findIssue->handle($issue);
        Gate::authorize('update', $model);

        $updated = $this->archiveIssue->handle($request->user(), ['issue_id' => $issue]);

        return IssueResource::make($updated)->response();
    }
}
