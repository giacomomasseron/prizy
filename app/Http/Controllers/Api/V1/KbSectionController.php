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
        private readonly CreateKbSection $createKbSection,
        private readonly UpdateKbSection $updateKbSection,
        private readonly DeleteKbSection $deleteKbSection,
        private readonly MoveKbSection $moveKbSection,
        private readonly ArchiveKbArticlesUnder $archiveKbArticlesUnder,
    ) {}

    public function store(KbSectionRequest $request): JsonResponse
    {
        return KbSectionResource::make($this->createKbSection->run($request->user(), $request->validated()))->response()->setStatusCode(201);
    }

    public function update(KbSectionRequest $request, string $id): JsonResponse
    {
        return KbSectionResource::make($this->updateKbSection->run($request->user(), $id, $request->validated()))->response();
    }

    public function destroy(Request $request, string $id): Response
    {
        $this->deleteKbSection->run($request->user(), $id);

        return response()->noContent();
    }

    public function move(KbMoveRequest $request, string $id): JsonResponse
    {
        return KbSectionResource::make($this->moveKbSection->run($request->user(), $id, $request->validated('direction')))->response();
    }

    public function archiveArticles(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => ['archived' => $this->archiveKbArticlesUnder->run($request->user(), 'section', $id)]]);
    }
}
