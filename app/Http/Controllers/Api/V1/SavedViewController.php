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
    public function index(Request $request): JsonResponse
    {
        $limit = min(max((int) $request->query('limit', '25'), 1), 100);

        return SavedViewResource::collection(ListSavedViews::run($limit))->response();
    }

    public function show(Request $request, string $savedView): JsonResponse
    {
        $model = FindSavedView::run($savedView);
        Gate::authorize('view', $model);

        return SavedViewResource::make($model)->response();
    }

    public function store(StoreSavedViewRequest $request): JsonResponse
    {
        $model = CreateSavedView::run($request->user(), $request->validated());

        return SavedViewResource::make($model)->response()->setStatusCode(201);
    }

    public function update(UpdateSavedViewRequest $request, string $savedView): JsonResponse
    {
        $existing = FindSavedView::run($savedView);
        Gate::authorize('update', $existing);

        $updated = UpdateSavedView::run($request->user(), array_merge($request->validated(), ['saved_view_id' => $savedView]));

        return SavedViewResource::make($updated)->response();
    }

    public function destroy(Request $request, string $savedView): Response
    {
        $model = FindSavedView::run($savedView);
        Gate::authorize('delete', $model);

        DeleteSavedView::run($request->user(), ['saved_view_id' => $savedView]);

        return response()->noContent();
    }
}
