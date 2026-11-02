<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\PatchReleaseRequest;
use App\Http\Requests\Api\V1\StoreReleaseRequest;
use App\Http\Resources\ReleaseResource;
use App\UseCases\Releases\CreateRelease;
use App\UseCases\Releases\DeleteRelease;
use App\UseCases\Releases\FindRelease;
use App\UseCases\Releases\ListReleases;
use App\UseCases\Releases\ShipRelease;
use App\UseCases\Releases\UpdateRelease;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

final class ReleaseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return ReleaseResource::collection(ListReleases::run($request->user()->workspace_id))->response();
    }

    public function show(Request $request, string $release): JsonResponse
    {
        $model = FindRelease::run($release, withDetail: true);
        Gate::authorize('view', $model);

        return ReleaseResource::make($model)->response();
    }

    public function store(StoreReleaseRequest $request): JsonResponse
    {
        $model = CreateRelease::run($request->user(), $request->validated());

        return ReleaseResource::make($model)->response()->setStatusCode(201);
    }

    public function update(PatchReleaseRequest $request, string $release): JsonResponse
    {
        $existing = FindRelease::run($release);
        Gate::authorize('update', $existing);

        $updated = UpdateRelease::run($existing, $request->validated());

        return ReleaseResource::make($updated)->response();
    }

    public function destroy(Request $request, string $release): Response
    {
        $model = FindRelease::run($release);
        Gate::authorize('delete', $model);

        DeleteRelease::run($model);

        return response()->noContent();
    }

    public function ship(Request $request, string $release): JsonResponse
    {
        $model = FindRelease::run($release);
        Gate::authorize('update', $model);

        return ReleaseResource::make(ShipRelease::run($model, true))->response();
    }

    public function unship(Request $request, string $release): JsonResponse
    {
        $model = FindRelease::run($release);
        Gate::authorize('update', $model);

        return ReleaseResource::make(ShipRelease::run($model, false))->response();
    }
}
