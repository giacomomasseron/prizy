<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\AgentsReportRequest;
use App\Http\Requests\Api\V1\OverviewReportRequest;
use App\Http\Requests\Api\V1\SlaReportRequest;
use App\UseCases\Reports\AgentsReport;
use App\UseCases\Reports\OverviewReport;
use App\UseCases\Reports\SlaReport;
use Illuminate\Http\JsonResponse;

final class ReportingController extends Controller
{
    public function __construct(
        private readonly OverviewReport $overviewReport,
        private readonly AgentsReport $agentsReport,
        private readonly SlaReport $slaReport,
    ) {}

    public function overview(OverviewReportRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->overviewReport->handle($request->user(), $request->range())]);
    }

    public function agents(AgentsReportRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->agentsReport->handle($request->user(), $request->range())]);
    }

    public function sla(SlaReportRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->slaReport->handle($request->user(), $request->range())]);
    }
}
