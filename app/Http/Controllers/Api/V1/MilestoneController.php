<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreMilestoneRequest;
use App\Http\Requests\Api\V1\UpdateMilestoneRequest;
use App\Http\Resources\MilestoneResource;
use App\UseCases\Milestones\CreateMilestone;
use App\UseCases\Milestones\DeleteMilestone;
use App\UseCases\Milestones\FindMilestone;
use App\UseCases\Milestones\ListMilestones;
use App\UseCases\Milestones\UpdateMilestone;
use App\UseCases\Projects\FindProject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

final class MilestoneController extends Controller
{
    public function __construct(
        private readonly FindProject $findProject,
        private readonly ListMilestones $listMilestones,
        private readonly CreateMilestone $createMilestone,
        private readonly FindMilestone $findMilestone,
        private readonly UpdateMilestone $updateMilestone,
        private readonly DeleteMilestone $deleteMilestone,
    ) {}

    public function index(Request $request, string $project): JsonResponse
    {
        $projectModel = $this->findProject->run($project);
        Gate::authorize('view', $projectModel);
        $limit = min(max((int) $request->query('limit', '25'), 1), 100);

        return MilestoneResource::collection($this->listMilestones->run($project, $limit))->response();
    }

    public function store(StoreMilestoneRequest $request, string $project): JsonResponse
    {
        // Class-level `create,Milestone` authz is enforced by route middleware (see routes),
        // NOT here — referencing Milestone::class in the controller would be a deptrac
        // Controller→Entity violation. We only resolve the parent project + check `view`.
        $projectModel = $this->findProject->run($project);
        Gate::authorize('view', $projectModel);

        $model = $this->createMilestone->run($request->user(), array_merge($request->validated(), ['project_id' => $project]));

        return MilestoneResource::make($model)->response()->setStatusCode(201);
    }

    public function update(UpdateMilestoneRequest $request, string $milestone): JsonResponse
    {
        $existing = $this->findMilestone->run($milestone);
        Gate::authorize('update', $existing);

        $updated = $this->updateMilestone->run($request->user(), array_merge($request->validated(), ['milestone_id' => $milestone]));

        return MilestoneResource::make($updated)->response();
    }

    public function destroy(Request $request, string $milestone): Response
    {
        $model = $this->findMilestone->run($milestone);
        Gate::authorize('delete', $model);

        $this->deleteMilestone->run($request->user(), ['milestone_id' => $milestone]);

        return response()->noContent();
    }
}
