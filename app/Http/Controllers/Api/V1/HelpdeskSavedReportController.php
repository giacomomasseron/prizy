<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\HelpdeskSavedReportRequest;
use App\Http\Resources\HelpdeskSavedReportResource;
use App\UseCases\HelpdeskSavedReports\CreateHelpdeskSavedReport;
use App\UseCases\HelpdeskSavedReports\DeleteHelpdeskSavedReport;
use App\UseCases\HelpdeskSavedReports\ListHelpdeskSavedReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class HelpdeskSavedReportController extends Controller
{
    public function __construct(
        private readonly ListHelpdeskSavedReport $listReports,
        private readonly CreateHelpdeskSavedReport $createReport,
        private readonly DeleteHelpdeskSavedReport $deleteReport,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return HelpdeskSavedReportResource::collection($this->listReports->handle($request->user()))->response();
    }

    public function store(HelpdeskSavedReportRequest $request): JsonResponse
    {
        return HelpdeskSavedReportResource::make($this->createReport->handle($request->user(), $request->validated()))->response()->setStatusCode(201);
    }

    public function destroy(Request $request, string $reportView): Response
    {
        $this->deleteReport->handle($request->user(), $reportView);

        return response()->noContent();
    }
}
