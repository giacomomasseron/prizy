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
    public function index(Request $request, string $issue): JsonResponse
    {
        $model = FindIssue::run($issue);
        Gate::authorize('view', $model);

        return LabelResource::collection(ListIssueLabels::run($issue))->response();
    }

    public function update(SetIssueLabelsRequest $request, string $issue): JsonResponse
    {
        $model = FindIssue::run($issue);
        Gate::authorize('update', $model);

        SetIssueLabels::run($request->user(), array_merge($request->validated(), ['issue_id' => $issue]));

        return LabelResource::collection(ListIssueLabels::run($issue))->response();
    }
}
