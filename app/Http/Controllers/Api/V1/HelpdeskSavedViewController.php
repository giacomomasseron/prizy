<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\HelpdeskSavedViewRequest;
use App\Http\Resources\HelpdeskSavedViewResource;
use App\UseCases\HelpdeskSavedViews\CreateHelpdeskSavedView;
use App\UseCases\HelpdeskSavedViews\DeleteHelpdeskSavedView;
use App\UseCases\HelpdeskSavedViews\ListHelpdeskSavedViews;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class HelpdeskSavedViewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return HelpdeskSavedViewResource::collection(ListHelpdeskSavedViews::run($request->user()))->response();
    }

    public function store(HelpdeskSavedViewRequest $request): JsonResponse
    {
        return HelpdeskSavedViewResource::make(CreateHelpdeskSavedView::run($request->user(), $request->validated()))->response()->setStatusCode(201);
    }

    public function destroy(Request $request, string $ticketView): Response
    {
        DeleteHelpdeskSavedView::run($request->user(), $ticketView);

        return response()->noContent();
    }
}
