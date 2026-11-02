<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreCycleRequest;
use App\Http\Requests\Api\V1\UpdateCycleRequest;
use App\Http\Resources\CycleResource;
use App\UseCases\Cycles\CreateCycle;
use App\UseCases\Cycles\DeleteCycle;
use App\UseCases\Cycles\FindCycle;
use App\UseCases\Cycles\ListCycles;
use App\UseCases\Cycles\UpdateCycle;
use App\UseCases\Teams\FindTeam;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

final class CycleController extends Controller
{
    public function __construct(
        private readonly FindTeam $findTeam,
        private readonly ListCycles $listCycles,
        private readonly CreateCycle $createCycle,
        private readonly FindCycle $findCycle,
        private readonly UpdateCycle $updateCycle,
        private readonly DeleteCycle $deleteCycle,
    ) {}

    public function index(Request $request, string $team): JsonResponse
    {
        $teamModel = $this->findTeam->run($team);
        Gate::authorize('view', $teamModel);
        $limit = min(max((int) $request->query('limit', '25'), 1), 100);

        return CycleResource::collection($this->listCycles->run($team, $limit))->response();
    }

    public function store(StoreCycleRequest $request, string $team): JsonResponse
    {
        // Class-level `create,Cycle` authz is enforced by route middleware (see routes),
        // NOT here — referencing Cycle::class in the controller would be a deptrac
        // Controller→Entity violation. We only resolve the parent team + check `view`.
        $teamModel = $this->findTeam->run($team);
        Gate::authorize('view', $teamModel);

        $model = $this->createCycle->run($request->user(), array_merge($request->validated(), ['team_id' => $team]));

        return CycleResource::make($model)->response()->setStatusCode(201);
    }

    public function update(UpdateCycleRequest $request, string $cycle): JsonResponse
    {
        $existing = $this->findCycle->run($cycle);
        Gate::authorize('update', $existing);

        $updated = $this->updateCycle->run($request->user(), array_merge($request->validated(), ['cycle_id' => $cycle]));

        return CycleResource::make($updated)->response();
    }

    public function destroy(Request $request, string $cycle): Response
    {
        $model = $this->findCycle->run($cycle);
        Gate::authorize('delete', $model);

        $this->deleteCycle->run($request->user(), ['cycle_id' => $cycle]);

        return response()->noContent();
    }
}
