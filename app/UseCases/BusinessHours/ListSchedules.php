<?php

declare(strict_types=1);

namespace App\UseCases\BusinessHours;

use App\Models\BusinessHourSchedule;
use App\Models\User;
use App\Repositories\ScheduleRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * @method static Collection run(User $actor)
 */
final class ListSchedules extends BaseUseCase implements UseCaseInterface
{
    private readonly ScheduleRepository $schedules;

    public function handle(mixed ...$arguments): mixed
    {
        $this->schedules = app(ScheduleRepository::class);

        return $this->execute(...$arguments);
    }

    /** @return Collection<int, BusinessHourSchedule> */
    private function execute(User $actor): Collection
    {
        HelpdeskAccess::gate($actor);

        return $this->schedules->forWorkspace();
    }
}
