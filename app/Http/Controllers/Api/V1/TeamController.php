<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreTeamRequest;
use App\Http\Requests\Api\V1\UpdateTeamRequest;
use App\Http\Resources\TeamResource;
use App\UseCases\Teams\CreateTeam;
use App\UseCases\Teams\DeleteTeam;
use App\UseCases\Teams\FindTeam;
use App\UseCases\Teams\ListTeams;
use App\UseCases\Teams\UpdateTeam;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

final class TeamController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $limit = min(max((int) $request->query('limit', '25'), 1), 100);
        $memberUserId = $request->boolean('mine') ? $request->user()->id : null;

        return TeamResource::collection(ListTeams::run($limit, $memberUserId))->response();
    }

    public function show(Request $request, string $team): JsonResponse
    {
        $model = FindTeam::run($team);
        Gate::authorize('view', $model);

        return TeamResource::make($model)->response();
    }

    public function store(StoreTeamRequest $request): JsonResponse
    {
        $model = CreateTeam::run($request->user(), $request->validated());

        return TeamResource::make($model)->response()->setStatusCode(201);
    }

    public function update(UpdateTeamRequest $request, string $team): JsonResponse
    {
        $existing = FindTeam::run($team);
        Gate::authorize('update', $existing);

        $updated = UpdateTeam::run($request->user(), array_merge($request->validated(), ['team_id' => $team]));

        return TeamResource::make($updated)->response();
    }

    public function destroy(Request $request, string $team): Response
    {
        $model = FindTeam::run($team);
        Gate::authorize('delete', $model);

        DeleteTeam::run($request->user(), ['team_id' => $team]);

        return response()->noContent();
    }
}
