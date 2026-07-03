<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\SearchIssuesRequest;
use App\Http\Resources\IssueResource;
use App\UseCases\Search\SearchIssues;
use App\UseCases\Search\SearchWorkspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class SearchController extends Controller
{
    public function __construct(
        private readonly SearchWorkspace $searchWorkspace,
        private readonly SearchIssues $searchIssues,
    ) {}

    public function issues(SearchIssuesRequest $request): JsonResponse
    {
        /** @var array<string, string> $filter */
        $filter = (array) $request->validated('filter', []);
        $q      = (string) $request->validated('q', '');
        $page   = (int) $request->validated('page', 1);

        $paginator = $this->searchIssues->handle($request->user(), $q, $filter, $page);

        return IssueResource::collection($paginator)->response();
    }

    public function index(Request $request): JsonResponse
    {
        $q      = (string) $request->query('q', '');
        $groups = $this->searchWorkspace->handle($request->user(), $q);

        return response()->json([
            'data' => [
                'issues'   => IssueResource::collection($groups['issues']),
                'projects' => $groups['projects']->map(fn ($p) => ['id' => $p->id, 'name' => $p->name])->values(),
                'teams'    => $groups['teams']->map(fn ($t) => ['id' => $t->id, 'name' => $t->name, 'identifier' => $t->identifier])->values(),
            ],
        ]);
    }
}
