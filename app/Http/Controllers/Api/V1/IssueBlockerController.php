<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\AddBlockerRequest;
use App\UseCases\Issues\AddIssueBlocker;
use App\UseCases\Issues\FindIssue;
use App\UseCases\Issues\RemoveIssueBlocker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

final class IssueBlockerController extends Controller
{
    public function __construct(
        private readonly FindIssue $findIssue,
        private readonly AddIssueBlocker $addIssueBlocker,
        private readonly RemoveIssueBlocker $removeIssueBlocker,
    ) {}

    public function store(AddBlockerRequest $request, string $issue): JsonResponse
    {
        $model = $this->findIssue->run($issue);
        Gate::authorize('update', $model);

        $blockingId = (string) $request->validated('blocking_issue_id');

        $this->addIssueBlocker->run($request->user(), [
            'blocking_issue_id' => $blockingId,
            'blocked_issue_id'  => $issue,
        ]);

        return new JsonResponse(['data' => ['blocking_issue_id' => $blockingId, 'blocked_issue_id' => $issue]], 201);
    }

    public function destroy(Request $request, string $issue, string $blockingIssue): Response
    {
        $model = $this->findIssue->run($issue);
        Gate::authorize('update', $model);

        $this->removeIssueBlocker->run($request->user(), [
            'blocking_issue_id' => $blockingIssue,
            'blocked_issue_id'  => $issue,
        ]);

        return response()->noContent();
    }
}
