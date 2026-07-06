<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreProjectRequest;
use App\Http\Requests\Api\V1\UpdateProjectRequest;
use App\Http\Resources\ProjectResource;
use App\UseCases\Projects\CreateProject;
use App\UseCases\Projects\DeleteProject;
use App\UseCases\Projects\FindProject;
use App\UseCases\Projects\ListProjects;
use App\UseCases\Projects\UpdateProject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

final class ProjectController extends Controller
{
    public function __construct(
        private readonly ListProjects $listProjects,
        private readonly FindProject $findProject,
        private readonly CreateProject $createProject,
        private readonly UpdateProject $updateProject,
        private readonly DeleteProject $deleteProject,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $limit = min(max((int) $request->query('limit', '25'), 1), 100);
        /** @var array<string, string> $filters */
        $filters = array_intersect_key((array) $request->query('filter', []), array_flip(['status', 'team_id']));

        return ProjectResource::collection($this->listProjects->handle($filters, $limit))->response();
    }

    public function show(Request $request, string $project): JsonResponse
    {
        $model = $this->findProject->handle($project);
        Gate::authorize('view', $model);

        $model->loadMissing('lead')
            ->loadCount(['issues', 'issues as done_count' => fn ($q) => $q->where('status', 'done')]);

        return ProjectResource::make($model)->response();
    }

    public function store(StoreProjectRequest $request): JsonResponse
    {
        $model = $this->createProject->handle($request->user(), $request->validated());

        return ProjectResource::make($model)->response()->setStatusCode(201);
    }

    public function update(UpdateProjectRequest $request, string $project): JsonResponse
    {
        $existing = $this->findProject->handle($project);
        Gate::authorize('update', $existing);

        $updated = $this->updateProject->handle($request->user(), array_merge($request->validated(), ['project_id' => $project]));

        return ProjectResource::make($updated)->response();
    }

    public function destroy(Request $request, string $project): Response
    {
        $model = $this->findProject->handle($project);
        Gate::authorize('delete', $model);

        $this->deleteProject->handle($request->user(), ['project_id' => $project]);

        return response()->noContent();
    }
}
