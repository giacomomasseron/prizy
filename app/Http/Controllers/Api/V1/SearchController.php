<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\IssueResource;
use App\UseCases\Search\SearchWorkspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class SearchController extends Controller
{
    public function __construct(private readonly SearchWorkspace $searchWorkspace) {}

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
