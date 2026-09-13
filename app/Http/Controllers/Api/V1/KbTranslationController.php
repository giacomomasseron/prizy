<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\KbTranslationRequest;
use App\Http\Requests\Api\V1\KbTranslationStatusRequest;
use App\Http\Resources\KbArticleTranslationResource;
use App\UseCases\Kb\ChangeKbTranslationStatus;
use App\UseCases\Kb\DeleteKbArticleTranslation;
use App\UseCases\Kb\ListKbArticleTranslations;
use App\UseCases\Kb\ShowKbArticleTranslation;
use App\UseCases\Kb\UpsertKbArticleTranslation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class KbTranslationController extends Controller
{
    public function __construct(
        private readonly ListKbArticleTranslations $listTranslations,
        private readonly ShowKbArticleTranslation $showTranslation,
        private readonly UpsertKbArticleTranslation $upsertTranslation,
        private readonly ChangeKbTranslationStatus $changeStatus,
        private readonly DeleteKbArticleTranslation $deleteTranslation,
    ) {}

    public function index(Request $request, string $id): JsonResponse
    {
        // The use case already returns the exact payload shape; a JsonResource
        // would only re-wrap a plain array.
        return response()->json(['data' => $this->listTranslations->handle($request->user(), $id)]);
    }

    public function show(Request $request, string $id, string $locale): JsonResponse
    {
        return KbArticleTranslationResource::make(
            $this->showTranslation->handle($request->user(), $id, $locale)
        )->response();
    }

    public function upsert(KbTranslationRequest $request, string $id, string $locale): JsonResponse
    {
        // ->response() alone would report 201 on the row's first save, because
        // JsonResource::response() checks the wrapped model's wasRecentlyCreated.
        // PUT is idempotent create-or-update here — the caller never needs to
        // distinguish the two — so the status code is pinned to 200 either way.
        return KbArticleTranslationResource::make(
            $this->upsertTranslation->handle($request->user(), $id, $locale, $request->validated())
        )->response()->setStatusCode(200);
    }

    public function status(KbTranslationStatusRequest $request, string $id, string $locale): JsonResponse
    {
        return KbArticleTranslationResource::make(
            $this->changeStatus->handle($request->user(), $id, $locale, $request->validated('status'))
        )->response();
    }

    public function destroy(Request $request, string $id, string $locale): Response
    {
        $this->deleteTranslation->handle($request->user(), $id, $locale);

        return response()->noContent();
    }
}
