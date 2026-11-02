<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\SlaPolicyRequest;
use App\Http\Resources\SlaPolicyResource;
use App\UseCases\SlaPolicies\CreateSlaPolicy;
use App\UseCases\SlaPolicies\DeleteSlaPolicy;
use App\UseCases\SlaPolicies\FindSlaPolicy;
use App\UseCases\SlaPolicies\ListSlaPolicies;
use App\UseCases\SlaPolicies\UpdateSlaPolicy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class SlaPolicyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return SlaPolicyResource::collection(ListSlaPolicies::run($request->user()))->response();
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return SlaPolicyResource::make(FindSlaPolicy::run($request->user(), $id))->response();
    }

    public function store(SlaPolicyRequest $request): JsonResponse
    {
        return SlaPolicyResource::make(CreateSlaPolicy::run($request->user(), $request->validated()))->response()->setStatusCode(201);
    }

    public function update(SlaPolicyRequest $request, string $id): JsonResponse
    {
        return SlaPolicyResource::make(UpdateSlaPolicy::run($request->user(), $id, $request->validated()))->response();
    }

    public function destroy(Request $request, string $id): Response
    {
        DeleteSlaPolicy::run($request->user(), $id);

        return response()->noContent();
    }
}
