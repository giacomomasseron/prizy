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
        private readonly CreateKbCategory $createKbCategory,
        private readonly UpdateKbCategory $updateKbCategory,
        private readonly DeleteKbCategory $deleteKbCategory,
        private readonly MoveKbCategory $moveKbCategory,
        private readonly ArchiveKbArticlesUnder $archiveKbArticlesUnder,
    ) {}

    public function store(KbCategoryRequest $request): JsonResponse
    {
        return KbCategoryResource::make($this->createKbCategory->run($request->user(), $request->categoryData()))->response()->setStatusCode(201);
    }

    public function update(KbCategoryRequest $request, string $id): JsonResponse
    {
        return KbCategoryResource::make($this->updateKbCategory->run($request->user(), $id, $request->categoryData()))->response();
    }

    public function destroy(Request $request, string $id): Response
    {
        $this->deleteKbCategory->run($request->user(), $id);

        return response()->noContent();
    }

    public function move(KbMoveRequest $request, string $id): JsonResponse
    {
        return KbCategoryResource::make($this->moveKbCategory->run($request->user(), $id, $request->validated('direction')))->response();
    }

    public function archiveArticles(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => ['archived' => $this->archiveKbArticlesUnder->run($request->user(), 'category', $id)]]);
    }
}
