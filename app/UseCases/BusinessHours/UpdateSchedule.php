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
 * @method static BusinessHourSchedule run(User $actor, string $id, array $data)
 */
final class UpdateSchedule extends BaseUseCase implements UseCaseInterface
{
    private readonly ScheduleRepository $schedules;

    public function handle(mixed ...$arguments): mixed
    {
        $this->schedules = app(ScheduleRepository::class);

        return $this->execute(...$arguments);
    }

    /** @param array<string,mixed> $data */
    private function execute(User $actor, string $id, array $data): BusinessHourSchedule
    {
        HelpdeskAccess::gateWrite($actor);
        $schedule = $this->schedules->find($id);
        abort_unless($schedule !== null, 404);

        return $this->schedules->update($schedule, ['name' => $data['name'], 'timezone' => $data['timezone']], $data['intervals']);
    }
}
