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
    public function __construct(
        private readonly ListLabels $listLabels,
        private readonly FindLabel $findLabel,
        private readonly CreateLabel $createLabel,
        private readonly UpdateLabel $updateLabel,
        private readonly DeleteLabel $deleteLabel,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $limit = min(max((int) $request->query('limit', '25'), 1), 100);

        return LabelResource::collection($this->listLabels->handle($limit))->response();
    }

    public function show(Request $request, string $label): JsonResponse
    {
        $model = $this->findLabel->handle($label);
        Gate::authorize('view', $model);

        return LabelResource::make($model)->response();
    }

    public function store(StoreLabelRequest $request): JsonResponse
    {
        $model = $this->createLabel->handle($request->user(), $request->validated());

        return LabelResource::make($model)->response()->setStatusCode(201);
    }

    public function update(UpdateLabelRequest $request, string $label): JsonResponse
    {
        $existing = $this->findLabel->handle($label);
        Gate::authorize('update', $existing);

        $updated = $this->updateLabel->handle($request->user(), array_merge($request->validated(), ['label_id' => $label]));

        return LabelResource::make($updated)->response();
    }

    public function destroy(Request $request, string $label): Response
    {
        $model = $this->findLabel->handle($label);
        Gate::authorize('delete', $model);

        $this->deleteLabel->handle($request->user(), ['label_id' => $label]);

        return response()->noContent();
    }
}
