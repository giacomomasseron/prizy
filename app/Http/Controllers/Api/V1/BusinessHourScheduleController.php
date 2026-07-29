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
    public function __construct(
        private readonly ListSchedules $listSchedules,
        private readonly FindSchedule $findSchedule,
        private readonly CreateSchedule $createSchedule,
        private readonly UpdateSchedule $updateSchedule,
        private readonly DeleteSchedule $deleteSchedule,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return ScheduleResource::collection($this->listSchedules->handle($request->user()))->response();
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return ScheduleResource::make($this->findSchedule->handle($request->user(), $id))->response();
    }

    public function store(ScheduleRequest $request): JsonResponse
    {
        $schedule = $this->createSchedule->handle($request->user(), $request->scheduleData());

        return ScheduleResource::make($schedule)->response()->setStatusCode(201);
    }

    public function update(ScheduleRequest $request, string $id): JsonResponse
    {
        $schedule = $this->updateSchedule->handle($request->user(), $id, $request->scheduleData());

        return ScheduleResource::make($schedule)->response();
    }

    public function destroy(Request $request, string $id): Response
    {
        $this->deleteSchedule->handle($request->user(), $id);

        return response()->noContent();
    }
}
