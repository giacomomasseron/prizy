<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\AgentsReportRequest;
use App\Http\Requests\Api\V1\CycleReportRequest;
use App\Http\Requests\Api\V1\OverviewReportRequest;
use App\Http\Requests\Api\V1\SlaReportRequest;
use App\Http\Requests\Api\V1\TrackerOverviewRequest;
use App\UseCases\Reports\AgentsReport;
use App\UseCases\Reports\CycleReport;
use App\UseCases\Reports\OverviewReport;
use App\UseCases\Reports\SlaReport;
use App\UseCases\Reports\TrackerOverviewReport;
use Illuminate\Http\JsonResponse;

final class ReportingController extends Controller
{
    public function overview(OverviewReportRequest $request): JsonResponse
    {
        return response()->json(['data' => OverviewReport::run($request->user(), $request->range())]);
    }

    public function agents(AgentsReportRequest $request): JsonResponse
    {
        return response()->json(['data' => AgentsReport::run($request->user(), $request->range())]);
    }

    public function sla(SlaReportRequest $request): JsonResponse
    {
        return response()->json(['data' => SlaReport::run($request->user(), $request->range())]);
    }

    public function trackerOverview(TrackerOverviewRequest $request): JsonResponse
    {
        return response()->json(['data' => TrackerOverviewReport::run($request->user(), $request->range())]);
    }

    public function cycles(CycleReportRequest $request): JsonResponse
    {
        return response()->json(['data' => CycleReport::run(
            $request->user(),
            (string) $request->validated('team_id'),
            $request->validated('cycle_id'),
        )]);
    }
}
