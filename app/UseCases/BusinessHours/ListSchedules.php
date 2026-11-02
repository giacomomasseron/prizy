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
 * @method Collection run(User $actor)
 */
final class ListSchedules extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly ScheduleRepository $schedules) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @return Collection<int, BusinessHourSchedule> */
    private function execute(User $actor): Collection
    {
        HelpdeskAccess::gate($actor);

        return $this->schedules->forWorkspace();
    }
}
