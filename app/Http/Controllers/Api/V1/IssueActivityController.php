<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\IssueActivityResource;
use App\UseCases\Issues\FindIssue;
use App\UseCases\Issues\ListIssueActivities;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

final class IssueActivityController extends Controller
{
    public function __construct(
        private readonly FindIssue $findIssue,
        private readonly ListIssueActivities $listActivities,
    ) {}

    public function index(Request $request, string $issue): JsonResponse
    {
        $model = $this->findIssue->handle($issue);
        Gate::authorize('view', $model);

        $limit = min(max((int) $request->query('limit', '25'), 1), 100);
        $page = $this->listActivities->handle($issue, $limit);

        return IssueActivityResource::collection($page)->response();
    }
}
