<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ScheduleRequest;
use App\Http\Resources\ScheduleResource;
use App\UseCases\BusinessHours\CreateSchedule;
use App\UseCases\BusinessHours\DeleteSchedule;
use App\UseCases\BusinessHours\FindSchedule;
use App\UseCases\BusinessHours\ListSchedules;
use App\UseCases\BusinessHours\UpdateSchedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class BusinessHourScheduleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return ScheduleResource::collection(ListSchedules::run($request->user()))->response();
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return ScheduleResource::make(FindSchedule::run($request->user(), $id))->response();
    }

    public function store(ScheduleRequest $request): JsonResponse
    {
        $schedule = CreateSchedule::run($request->user(), $request->scheduleData());

        return ScheduleResource::make($schedule)->response()->setStatusCode(201);
    }

    public function update(ScheduleRequest $request, string $id): JsonResponse
    {
        $schedule = UpdateSchedule::run($request->user(), $id, $request->scheduleData());

        return ScheduleResource::make($schedule)->response();
    }

    public function destroy(Request $request, string $id): Response
    {
        DeleteSchedule::run($request->user(), $id);

        return response()->noContent();
    }
}
