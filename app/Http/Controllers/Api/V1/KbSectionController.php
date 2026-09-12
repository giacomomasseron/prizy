<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\KbMoveRequest;
use App\Http\Requests\Api\V1\KbSectionRequest;
use App\Http\Resources\KbSectionResource;
use App\UseCases\Kb\ArchiveKbArticlesUnder;
use App\UseCases\Kb\CreateKbSection;
use App\UseCases\Kb\DeleteKbSection;
use App\UseCases\Kb\MoveKbSection;
use App\UseCases\Kb\UpdateKbSection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class KbSectionController extends Controller
{
    public function __construct(
        private readonly CreateKbSection $create,
        private readonly UpdateKbSection $update,
        private readonly DeleteKbSection $delete,
        private readonly MoveKbSection $move,
        private readonly ArchiveKbArticlesUnder $archiveUnder,
    ) {}

    public function store(KbSectionRequest $request): JsonResponse
    {
        return KbSectionResource::make($this->create->handle($request->user(), $request->validated()))->response()->setStatusCode(201);
    }

    public function update(KbSectionRequest $request, string $id): JsonResponse
    {
        return KbSectionResource::make($this->update->handle($request->user(), $id, $request->validated()))->response();
    }

    public function destroy(Request $request, string $id): Response
    {
        $this->delete->handle($request->user(), $id);

        return response()->noContent();
    }

    public function move(KbMoveRequest $request, string $id): JsonResponse
    {
        return KbSectionResource::make($this->move->handle($request->user(), $id, $request->validated('direction')))->response();
    }

    public function archiveArticles(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => ['archived' => $this->archiveUnder->handle($request->user(), 'section', $id)]]);
    }
}
