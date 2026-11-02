<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreLabelRequest;
use App\Http\Requests\Api\V1\UpdateLabelRequest;
use App\Http\Resources\LabelResource;
use App\UseCases\Labels\CreateLabel;
use App\UseCases\Labels\DeleteLabel;
use App\UseCases\Labels\FindLabel;
use App\UseCases\Labels\ListLabels;
use App\UseCases\Labels\UpdateLabel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

final class LabelController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $limit = min(max((int) $request->query('limit', '25'), 1), 100);

        return LabelResource::collection(ListLabels::run($limit))->response();
    }

    public function show(Request $request, string $label): JsonResponse
    {
        $model = FindLabel::run($label);
        Gate::authorize('view', $model);

        return LabelResource::make($model)->response();
    }

    public function store(StoreLabelRequest $request): JsonResponse
    {
        $model = CreateLabel::run($request->user(), $request->validated());

        return LabelResource::make($model)->response()->setStatusCode(201);
    }

    public function update(UpdateLabelRequest $request, string $label): JsonResponse
    {
        $existing = FindLabel::run($label);
        Gate::authorize('update', $existing);

        $updated = UpdateLabel::run($request->user(), array_merge($request->validated(), ['label_id' => $label]));

        return LabelResource::make($updated)->response();
    }

    public function destroy(Request $request, string $label): Response
    {
        $model = FindLabel::run($label);
        Gate::authorize('delete', $model);

        DeleteLabel::run($request->user(), ['label_id' => $label]);

        return response()->noContent();
    }
}
