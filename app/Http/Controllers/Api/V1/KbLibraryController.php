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
        private readonly ShowKbLibrary $showKbLibrary,
        private readonly PreviewKbMarkdown $previewKbMarkdown,
    ) {}

    public function library(Request $request): JsonResponse
    {
        $tree = $this->showKbLibrary->run($request->user());

        return response()->json(['data' => (new KbLibraryResource($tree))->toArray($request)]);
    }

    public function preview(KbPreviewRequest $request): JsonResponse
    {
        return response()->json(['data' => ['html' => $this->previewKbMarkdown->run($request->user(), (string) ($request->validated('body') ?? ''))]]);
    }
}
