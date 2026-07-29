<?php

declare(strict_types=1);

namespace App\UseCases\BusinessHours;

use App\Models\BusinessHourSchedule;
use App\Models\User;
use App\Repositories\ScheduleRepository;

final class FindSchedule
{
    public function __construct(private readonly ScheduleRepository $schedules) {}

    public function handle(User $actor, string $id): BusinessHourSchedule
    {
        abort_unless($actor->is_agent, 403);
        $schedule = $this->schedules->find($id);
        abort_unless($schedule !== null, 404);

        return $schedule;
    }
}
