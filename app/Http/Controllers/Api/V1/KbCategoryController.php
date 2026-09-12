<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\KbCategoryRequest;
use App\Http\Requests\Api\V1\KbMoveRequest;
use App\Http\Resources\KbCategoryResource;
use App\UseCases\Kb\ArchiveKbArticlesUnder;
use App\UseCases\Kb\CreateKbCategory;
use App\UseCases\Kb\DeleteKbCategory;
use App\UseCases\Kb\MoveKbCategory;
use App\UseCases\Kb\UpdateKbCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class KbCategoryController extends Controller
{
    public function __construct(
        private readonly CreateKbCategory $create,
        private readonly UpdateKbCategory $update,
        private readonly DeleteKbCategory $delete,
        private readonly MoveKbCategory $move,
        private readonly ArchiveKbArticlesUnder $archiveUnder,
    ) {}

    public function store(KbCategoryRequest $request): JsonResponse
    {
        return KbCategoryResource::make($this->create->handle($request->user(), $request->categoryData()))->response()->setStatusCode(201);
    }

    public function update(KbCategoryRequest $request, string $id): JsonResponse
    {
        return KbCategoryResource::make($this->update->handle($request->user(), $id, $request->categoryData()))->response();
    }

    public function destroy(Request $request, string $id): Response
    {
        $this->delete->handle($request->user(), $id);

        return response()->noContent();
    }

    public function move(KbMoveRequest $request, string $id): JsonResponse
    {
        return KbCategoryResource::make($this->move->handle($request->user(), $id, $request->validated('direction')))->response();
    }

    public function archiveArticles(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => ['archived' => $this->archiveUnder->handle($request->user(), 'category', $id)]]);
    }
}
