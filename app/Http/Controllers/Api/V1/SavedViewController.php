<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreSavedViewRequest;
use App\Http\Requests\Api\V1\UpdateSavedViewRequest;
use App\Http\Resources\SavedViewResource;
use App\UseCases\SavedViews\CreateSavedView;
use App\UseCases\SavedViews\DeleteSavedView;
use App\UseCases\SavedViews\FindSavedView;
use App\UseCases\SavedViews\ListSavedViews;
use App\UseCases\SavedViews\UpdateSavedView;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

final class SavedViewController extends Controller
{
    public function __construct(
        private readonly ListSavedViews $listSavedViews,
        private readonly FindSavedView $findSavedView,
        private readonly CreateSavedView $createSavedView,
        private readonly UpdateSavedView $updateSavedView,
        private readonly DeleteSavedView $deleteSavedView,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $limit = min(max((int) $request->query('limit', '25'), 1), 100);

        return SavedViewResource::collection($this->listSavedViews->handle($limit))->response();
    }

    public function show(Request $request, string $savedView): JsonResponse
    {
        $model = $this->findSavedView->handle($savedView);
        Gate::authorize('view', $model);

        return SavedViewResource::make($model)->response();
    }

    public function store(StoreSavedViewRequest $request): JsonResponse
    {
        $model = $this->createSavedView->handle($request->user(), $request->validated());

        return SavedViewResource::make($model)->response()->setStatusCode(201);
    }

    public function update(UpdateSavedViewRequest $request, string $savedView): JsonResponse
    {
        $existing = $this->findSavedView->handle($savedView);
        Gate::authorize('update', $existing);

        $updated = $this->updateSavedView->handle($request->user(), array_merge($request->validated(), ['saved_view_id' => $savedView]));

        return SavedViewResource::make($updated)->response();
    }

    public function destroy(Request $request, string $savedView): Response
    {
        $model = $this->findSavedView->handle($savedView);
        Gate::authorize('delete', $model);

        $this->deleteSavedView->handle($request->user(), ['saved_view_id' => $savedView]);

        return response()->noContent();
    }
}
