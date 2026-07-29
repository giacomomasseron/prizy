<?php

declare(strict_types=1);

namespace App\UseCases\BusinessHours;

use App\Models\BusinessHourSchedule;
use App\Models\User;
use App\Repositories\ScheduleRepository;

final class CreateSchedule
{
    public function __construct(private readonly ScheduleRepository $schedules) {}

    /** @param array<string,mixed> $data */
    public function handle(User $actor, array $data): BusinessHourSchedule
    {
        abort_unless($actor->is_agent, 403);

        return $this->schedules->create(
            ['name' => $data['name'], 'timezone' => $data['timezone']],
            $data['intervals'],
        );
    }
}
