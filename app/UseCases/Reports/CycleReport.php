<?php

declare(strict_types=1);

namespace App\UseCases\Reports;

use App\Models\Cycle;
use App\Models\Team;
use App\Models\User;
use App\Repositories\TrackerReportRepository;
use Illuminate\Validation\ValidationException;

final class CycleReport
{
    public function __construct(private readonly TrackerReportRepository $reports) {}

    /** @return array<string, mixed> */
    public function handle(User $actor, string $teamId, ?string $cycleId): array
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
