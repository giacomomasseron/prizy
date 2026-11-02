<?php

declare(strict_types=1);

namespace App\UseCases\BusinessHours;

use App\Models\BusinessHourSchedule;
use App\Models\User;
use App\Repositories\ScheduleRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method BusinessHourSchedule run(User $actor, string $id)
 */
final class FindSchedule extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly ScheduleRepository $schedules) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    private function execute(User $actor, string $id): BusinessHourSchedule
    {
        HelpdeskAccess::gate($actor);
        $schedule = $this->schedules->find($id);
        abort_unless($schedule !== null, 404);

        return $schedule;
    }
}
