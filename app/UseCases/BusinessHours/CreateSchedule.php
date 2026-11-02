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
 * @method BusinessHourSchedule run(User $actor, array $data)
 */
final class CreateSchedule extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly ScheduleRepository $schedules) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @param array<string,mixed> $data */
    private function execute(User $actor, array $data): BusinessHourSchedule
    {
        HelpdeskAccess::gateWrite($actor);

        return $this->schedules->create(
            ['name' => $data['name'], 'timezone' => $data['timezone']],
            $data['intervals'],
        );
    }
}
