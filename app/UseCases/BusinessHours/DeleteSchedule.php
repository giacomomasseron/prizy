<?php

declare(strict_types=1);

namespace App\UseCases\BusinessHours;

use App\Models\User;
use App\Repositories\ScheduleRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method void run(User $actor, string $id)
 */
final class DeleteSchedule extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly ScheduleRepository $schedules) {}

    public function handle(mixed ...$arguments): mixed
    {
        $this->execute(...$arguments);

        return null;
    }

    private function execute(User $actor, string $id): void
    {
        HelpdeskAccess::gateWrite($actor);
        $schedule = $this->schedules->find($id);
        abort_unless($schedule !== null, 404);

        $this->schedules->delete($schedule);
    }
}
