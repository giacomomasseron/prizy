<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\UseCases\Kb\ListKbArticleTranslations;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class KbTranslationController extends Controller
{
    public function __construct(
        private readonly ListKbArticleTranslations $listTranslations,
    ) {}

    public function index(Request $request, string $id): JsonResponse
    {
        // The use case already returns the exact payload shape; a JsonResource
        // would only re-wrap a plain array.
        return response()->json(['data' => $this->listTranslations->handle($request->user(), $id)]);
    }
}
