<?php

declare(strict_types=1);

namespace App\UseCases\BusinessHours;

use App\Models\BusinessHourSchedule;
use App\Models\User;
use App\Repositories\ScheduleRepository;

final class UpdateSchedule
{
    public function __construct(private readonly ScheduleRepository $schedules) {}

    /** @param array<string,mixed> $data */
    public function handle(User $actor, string $id, array $data): BusinessHourSchedule
    {
        abort_unless($actor->is_agent, 403);
        $schedule = $this->schedules->find($id);
        abort_unless($schedule !== null, 404);

        return $this->schedules->update($schedule, ['name' => $data['name'], 'timezone' => $data['timezone']], $data['intervals']);
    }
}
