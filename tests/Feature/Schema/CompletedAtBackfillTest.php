<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/**
 * Proves the two backfill UPDATE statements in
 * 2026_09_09_000001_add_completed_at_to_issues.php actually do what the
 * migration claims: prefer the audit-log done-transition time, else fall
 * back to updated_at, and never touch a non-done issue. The migration
 * itself already ran (RefreshDatabase) against seed-less rows, so this
 * replays the same SQL verbatim against a hand-built fixture that isolates
 * each behavior.
 *
 * @return array{0: Workspace, 1: Team, 2: User}
 */
function backfillWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create();
    $team = Team::factory()->for($ws, 'workspace')->create();

    return [$ws, $team, $user];
}

function backfillIssue(Workspace $ws, Team $team, User $user, string $status): Issue
{
    return Issue::forceCreate([
        'id' => (string) Str::uuid(),
        'workspace_id' => $ws->id,
        'team_id' => $team->id,
        'created_by' => $user->id,
        'title' => 'Backfill probe',
        'status' => $status,
        'priority' => 'medium',
    ]);
}

function backfillActivity(Issue $issue, ?User $user, string $type, ?string $toValue, Carbon $createdAt): void
{
    DB::table('issue_activities')->insert([
        'id' => (string) Str::uuid(),
        'issue_id' => $issue->id,
        'user_id' => $user?->id,
        'type' => $type,
        'from_value' => null,
        'to_value' => $toValue,
        'created_at' => $createdAt,
    ]);
}

/** Runs the migration's two backfill UPDATEs verbatim (no parameters — pure raw SQL). */
function backfillRunMigrationSql(): void
{
    DB::statement(<<<'SQL'
        UPDATE issues SET completed_at = (
            SELECT max(a.created_at) FROM issue_activities a
            WHERE a.issue_id = issues.id
              AND a.type = 'status_changed'
              AND a.to_value = 'done'
        ) WHERE status = 'done';
    SQL);

    DB::statement(<<<'SQL'
        UPDATE issues SET completed_at = updated_at
        WHERE status = 'done' AND completed_at IS NULL;
    SQL);
}

it('backfills completed_at from the activity log, falls back to updated_at, and leaves non-done issues untouched', function (): void {
    [$ws, $team, $user] = backfillWorld();

    $activityTime = Carbon::parse('2026-08-01 10:00:00');
    $doneWithActivity = backfillIssue($ws, $team, $user, 'done');
    backfillActivity($doneWithActivity, $user, 'status_changed', 'done', $activityTime);

    $doneWithoutActivity = backfillIssue($ws, $team, $user, 'done');

    $todo = backfillIssue($ws, $team, $user, 'todo');

    // Simulate pre-migration state: no completed_at populated yet.
    DB::table('issues')->update(['completed_at' => null]);

    backfillRunMigrationSql();

    $doneWithActivity->refresh();
    $doneWithoutActivity->refresh();
    $todo->refresh();

    expect($doneWithActivity->completed_at)->not->toBeNull();
    expect($doneWithActivity->completed_at->equalTo($activityTime))->toBeTrue();

    expect($doneWithoutActivity->completed_at)->not->toBeNull();
    expect($doneWithoutActivity->completed_at->equalTo($doneWithoutActivity->updated_at))->toBeTrue();

    expect($todo->completed_at)->toBeNull();

    Workspace::forgetCurrent();
});
