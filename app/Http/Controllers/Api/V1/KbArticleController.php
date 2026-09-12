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
    public function __construct(
        private readonly FindKbArticleForEdit $find,
        private readonly CreateKbArticle $create,
        private readonly UpdateKbArticle $update,
        private readonly DeleteKbArticle $delete,
        private readonly MoveKbArticle $move,
        private readonly ChangeKbArticleStatus $changeStatus,
    ) {}

    public function show(Request $request, string $id): JsonResponse
    {
        return KbArticleEditResource::make($this->find->handle($request->user(), $id))->response();
    }

    public function store(KbArticleRequest $request): JsonResponse
    {
        return KbArticleEditResource::make($this->create->handle($request->user(), $request->articleData()))->response()->setStatusCode(201);
    }

    public function update(KbArticleRequest $request, string $id): JsonResponse
    {
        return KbArticleEditResource::make($this->update->handle($request->user(), $id, $request->articleData()))->response();
    }

    public function destroy(Request $request, string $id): Response
    {
        $this->delete->handle($request->user(), $id);

        return response()->noContent();
    }

    public function move(KbMoveRequest $request, string $id): JsonResponse
    {
        return KbArticleEditResource::make($this->move->handle($request->user(), $id, $request->validated('direction')))->response();
    }

    public function status(KbArticleStatusRequest $request, string $id): JsonResponse
    {
        return KbArticleEditResource::make($this->changeStatus->handle($request->user(), $id, $request->validated('status')))->response();
    }
}
