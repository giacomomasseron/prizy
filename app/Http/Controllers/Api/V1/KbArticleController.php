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
        private readonly FindKbArticleForEdit $findKbArticleForEdit,
        private readonly CreateKbArticle $createKbArticle,
        private readonly UpdateKbArticle $updateKbArticle,
        private readonly DeleteKbArticle $deleteKbArticle,
        private readonly MoveKbArticle $moveKbArticle,
        private readonly ChangeKbArticleStatus $changeKbArticleStatus,
    ) {}

    public function show(Request $request, string $id): JsonResponse
    {
        return KbArticleEditResource::make($this->findKbArticleForEdit->run($request->user(), $id))->response();
    }

    public function store(KbArticleRequest $request): JsonResponse
    {
        return KbArticleEditResource::make($this->createKbArticle->run($request->user(), $request->articleData()))->response()->setStatusCode(201);
    }

    public function update(KbArticleRequest $request, string $id): JsonResponse
    {
        return KbArticleEditResource::make($this->updateKbArticle->run($request->user(), $id, $request->articleData()))->response();
    }

    public function destroy(Request $request, string $id): Response
    {
        $this->deleteKbArticle->run($request->user(), $id);

        return response()->noContent();
    }

    public function move(KbMoveRequest $request, string $id): JsonResponse
    {
        return KbArticleEditResource::make($this->moveKbArticle->run($request->user(), $id, $request->validated('direction')))->response();
    }

    public function status(KbArticleStatusRequest $request, string $id): JsonResponse
    {
        return KbArticleEditResource::make($this->changeKbArticleStatus->run($request->user(), $id, $request->validated('status')))->response();
    }
}
