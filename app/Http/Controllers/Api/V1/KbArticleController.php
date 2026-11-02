<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\KbArticleRequest;
use App\Http\Requests\Api\V1\KbArticleStatusRequest;
use App\Http\Requests\Api\V1\KbMoveRequest;
use App\Http\Resources\KbArticleEditResource;
use App\UseCases\Kb\ChangeKbArticleStatus;
use App\UseCases\Kb\CreateKbArticle;
use App\UseCases\Kb\DeleteKbArticle;
use App\UseCases\Kb\FindKbArticleForEdit;
use App\UseCases\Kb\MoveKbArticle;
use App\UseCases\Kb\UpdateKbArticle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class KbArticleController extends Controller
{
    public function show(Request $request, string $id): JsonResponse
    {
        return KbArticleEditResource::make(FindKbArticleForEdit::run($request->user(), $id))->response();
    }

    public function store(KbArticleRequest $request): JsonResponse
    {
        return KbArticleEditResource::make(CreateKbArticle::run($request->user(), $request->articleData()))->response()->setStatusCode(201);
    }

    public function update(KbArticleRequest $request, string $id): JsonResponse
    {
        return KbArticleEditResource::make(UpdateKbArticle::run($request->user(), $id, $request->articleData()))->response();
    }

    public function destroy(Request $request, string $id): Response
    {
        DeleteKbArticle::run($request->user(), $id);

        return response()->noContent();
    }

    public function move(KbMoveRequest $request, string $id): JsonResponse
    {
        return KbArticleEditResource::make(MoveKbArticle::run($request->user(), $id, $request->validated('direction')))->response();
    }

    public function status(KbArticleStatusRequest $request, string $id): JsonResponse
    {
        return KbArticleEditResource::make(ChangeKbArticleStatus::run($request->user(), $id, $request->validated('status')))->response();
    }
}
