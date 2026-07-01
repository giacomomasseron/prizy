<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\SetIssueLabelsRequest;
use App\Http\Resources\LabelResource;
use App\UseCases\Issues\FindIssue;
use App\UseCases\Issues\ListIssueLabels;
use App\UseCases\Issues\SetIssueLabels;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

final class IssueLabelController extends Controller
{
    public function __construct(
        private readonly FindIssue $findIssue,
        private readonly SetIssueLabels $setIssueLabels,
        private readonly ListIssueLabels $listIssueLabels,
    ) {}

    public function index(Request $request, string $issue): JsonResponse
    {
        $model = $this->findIssue->handle($issue);
        Gate::authorize('view', $model);

        return LabelResource::collection($this->listIssueLabels->handle($issue))->response();
    }

    public function update(SetIssueLabelsRequest $request, string $issue): JsonResponse
    {
        $model = $this->findIssue->handle($issue);
        Gate::authorize('update', $model);

        $this->setIssueLabels->handle($request->user(), array_merge($request->validated(), ['issue_id' => $issue]));

        return LabelResource::collection($this->listIssueLabels->handle($issue))->response();
    }
}
