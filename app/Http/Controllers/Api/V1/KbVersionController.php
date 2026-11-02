<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\KbArticleEditResource;
use App\Http\Resources\KbArticleVersionDetailResource;
use App\Http\Resources\KbArticleVersionResource;
use App\UseCases\Kb\ListKbArticleVersions;
use App\UseCases\Kb\RestoreKbArticleVersion;
use App\UseCases\Kb\ShowKbArticleVersion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class KbVersionController extends Controller
{
    public function index(Request $request, string $id): JsonResponse
    {
        return KbArticleVersionResource::collection(ListKbArticleVersions::run($request->user(), $id))->response();
    }

    public function show(Request $request, string $id, string $versionId): JsonResponse
    {
        return KbArticleVersionDetailResource::make(ShowKbArticleVersion::run($request->user(), $id, $versionId))->response();
    }

    public function restore(Request $request, string $id, string $versionId): JsonResponse
    {
        return KbArticleEditResource::make(RestoreKbArticleVersion::run($request->user(), $id, $versionId))->response();
    }
}
