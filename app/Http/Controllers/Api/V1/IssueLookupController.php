<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LookupIssuesRequest;
use App\Http\Resources\IssueLookupResource;
use App\UseCases\Issues\LookupIssues;
use Illuminate\Http\JsonResponse;

/** GET /v1/issues/lookup?q= — the issue picker's server half (PRD §3.2.1). Tracker users only. */
final class IssueLookupController extends Controller
{
    public function __construct(
        private readonly LookupIssues $lookupIssues,
    ) {}

    public function index(LookupIssuesRequest $request): JsonResponse
    {
        /** @var string $q */
        $q = $request->validated('q');

        return IssueLookupResource::collection($this->lookupIssues->handle($q))->response();
    }
}
