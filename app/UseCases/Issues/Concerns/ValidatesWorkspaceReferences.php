<?php

declare(strict_types=1);

namespace App\UseCases\Issues\Concerns;

use App\Models\Cycle;
use App\Models\Issue;
use App\Models\Project;
use App\Models\Release;
use App\Models\Team;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Guards that FK inputs resolve to rows in the CURRENT workspace.
 * Team/User/Project/Issue are TenantAwareEntity → find() is workspace-scoped.
 * Cycle is NOT tenant-scoped (no workspace_id); it is validated transitively
 * through its team.
 */
trait ValidatesWorkspaceReferences
{
    private function assertTeamInWorkspace(string $teamId): void
    {
        if (Team::find($teamId) === null) {
            throw ValidationException::withMessages(['team_id' => ['The selected team is invalid.']]);
        }
    }

    private function assertAssigneeInWorkspace(?string $userId): void
    {
        if ($userId !== null && User::find($userId) === null) {
            throw ValidationException::withMessages(['assignee_id' => ['The selected assignee is invalid.']]);
        }
    }

    private function assertIssueInWorkspace(?string $issueId, string $field = 'issue_id'): void
    {
        if ($issueId !== null && Issue::find($issueId) === null) {
            throw ValidationException::withMessages([$field => ['The selected issue is invalid.']]);
        }
    }

    private function assertProjectInWorkspace(?string $projectId): void
    {
        if ($projectId !== null && Project::find($projectId) === null) {
            throw ValidationException::withMessages(['project_id' => ['The selected project is invalid.']]);
        }
    }

    private function assertReleaseInWorkspace(?string $releaseId): void
    {
        if ($releaseId !== null && Release::find($releaseId) === null) {
            throw ValidationException::withMessages(['release_id' => ['The selected release is invalid.']]);
        }
    }

    private function assertCycleInWorkspace(?string $cycleId): void
    {
        if ($cycleId === null) {
            return;
        }

        $cycle = Cycle::find($cycleId);

        if ($cycle === null || Team::find($cycle->team_id) === null) {
            throw ValidationException::withMessages(['cycle_id' => ['The selected cycle is invalid.']]);
        }
    }
}
