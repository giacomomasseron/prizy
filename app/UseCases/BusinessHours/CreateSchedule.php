<?php

declare(strict_types=1);

namespace App\UseCases\BusinessHours;

use App\Models\BusinessHourSchedule;
use App\Models\User;
use App\Repositories\ScheduleRepository;
use App\Services\HelpdeskAccess;

final class CreateSchedule
{
    public function __construct(private readonly ScheduleRepository $schedules) {}

    /** @param array<string,mixed> $data */
    public function handle(User $actor, array $data): BusinessHourSchedule
    {
        HelpdeskAccess::gate($actor);

        return $this->schedules->create(
            ['name' => $data['name'], 'timezone' => $data['timezone']],
            $data['intervals'],
        );
    }
}
