<?php

declare(strict_types=1);

namespace App\UseCases\Reports;

use App\Models\Cycle;
use App\Models\Team;
use App\Models\User;
use App\Repositories\TrackerReportRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Validation\ValidationException;

/**
 * @method array run(User $actor, string $teamId, ?string $cycleId)
 */
final class CycleReport extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly TrackerReportRepository $reports) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @return array<string, mixed> */
    private function execute(User $actor, string $teamId, ?string $cycleId): array
    {
        abort_unless($actor->is_developer || $actor->admin_level === 'owner', 403);

        // Team::find is workspace-scoped (TenantAwareEntity) — a foreign team resolves null.
        if (Team::find($teamId) === null) {
            throw ValidationException::withMessages(['team_id' => ['The selected team is invalid.']]);
        }
        // Cycles have no workspace_id; validated transitively through the team.
        if ($cycleId !== null && Cycle::query()->where('team_id', $teamId)->whereKey($cycleId)->doesntExist()) {
            throw ValidationException::withMessages(['cycle_id' => ['The selected cycle is invalid.']]);
        }

        return $this->reports->cycles($actor->workspace_id, $teamId, $cycleId);
    }
}
