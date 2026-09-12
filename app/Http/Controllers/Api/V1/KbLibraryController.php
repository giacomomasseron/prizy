<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\KbPreviewRequest;
use App\Http\Resources\KbLibraryResource;
use App\UseCases\Kb\PreviewKbMarkdown;
use App\UseCases\Kb\ShowKbLibrary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class KbLibraryController extends Controller
{
    public function __construct(
        private readonly ShowKbLibrary $showLibrary,
        private readonly PreviewKbMarkdown $preview,
    ) {}

    public function library(Request $request): JsonResponse
    {
        $tree = $this->showLibrary->handle($request->user());

        return response()->json(['data' => (new KbLibraryResource($tree))->toArray($request)]);
    }

    public function preview(KbPreviewRequest $request): JsonResponse
    {
        return response()->json(['data' => ['html' => $this->preview->handle($request->user(), (string) ($request->validated('body') ?? ''))]]);
    }
}
