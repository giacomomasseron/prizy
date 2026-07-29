<?php

declare(strict_types=1);

namespace App\UseCases\BusinessHours;

use App\Models\BusinessHourSchedule;
use App\Models\User;
use App\Repositories\ScheduleRepository;
use Illuminate\Database\Eloquent\Collection;

final class ListSchedules
{
    public function __construct(private readonly ScheduleRepository $schedules) {}

    /** @return Collection<int, BusinessHourSchedule> */
    public function handle(User $actor): Collection
    {
        abort_unless($actor->is_agent, 403);

        return $this->schedules->forWorkspace();
    }
}
