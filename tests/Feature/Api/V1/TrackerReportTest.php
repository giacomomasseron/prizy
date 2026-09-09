<?php

declare(strict_types=1);

use App\Models\Cycle;
use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/**
 * @param  array<string,mixed>  $flags
 * @return array{0:string,1:Workspace,2:Team}
 */
function trackerReportWorld(array $flags = ['is_developer' => true]): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $flags));
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];
    $team = Team::factory()->for($ws, 'workspace')->create();

    return [$token, $ws, $team];
}

/** @param array<string,mixed> $attrs */
function trackerReportIssue(Workspace $ws, Team $team, array $attrs = []): Issue
{
    return Issue::forceCreate(array_merge([
        'id' => (string) Str::uuid(),
        'workspace_id' => $ws->id,
        'team_id' => $team->id,
        'created_by' => User::withoutGlobalScopes()->where('workspace_id', $ws->id)->first()->id,
        'title' => 'Metric probe',
        'status' => 'todo',
        'priority' => 'medium',
    ], $attrs));
}

it('403s tracker-overview for an agent-only user', function (): void {
    [$token] = trackerReportWorld(['is_developer' => false, 'is_agent' => true, 'admin_level' => 'member']);
    $this->withToken($token)->getJson('/v1/reports/tracker-overview?range=7d')->assertStatus(403);
    Workspace::forgetCurrent();
});

it('200s tracker-overview for a developer, an owner without dev, and a viewer with dev', function (): void {
    foreach ([
        ['is_developer' => true, 'admin_level' => 'member'],
        ['is_developer' => false, 'admin_level' => 'owner'],
        ['is_developer' => true, 'admin_level' => 'viewer'],
    ] as $flags) {
        // EnsureValidTenantSession pins the tenant id into the session; the
        // array session driver merges (not replaces) attributes on a fresh
        // id, so the singleton Session object leaks the previous iteration's
        // tenant pin across these same-test cross-tenant calls. Flush first.
        test()->flushSession();
        [$token] = trackerReportWorld($flags);
        $this->withToken($token)->getJson('/v1/reports/tracker-overview?range=7d')->assertOk();
        Workspace::forgetCurrent();
    }
});

it('rejects an unknown range with 422', function (): void {
    [$token] = trackerReportWorld();
    $this->withToken($token)->getJson('/v1/reports/tracker-overview?range=14d')->assertStatus(422);
    Workspace::forgetCurrent();
});

it('computes created/completed/active KPIs and deltas over pinned windows', function (): void {
    Carbon::setTestNow('2026-09-09 12:00:00');
    [$token, $ws, $team] = trackerReportWorld();

    // current window (last 7d): 3 created, 2 completed, 1 active
    trackerReportIssue($ws, $team, ['created_at' => now()->subDays(2), 'status' => 'in_progress']);
    trackerReportIssue($ws, $team, ['created_at' => now()->subDays(3), 'status' => 'done', 'completed_at' => now()->subDays(1)]);
    trackerReportIssue($ws, $team, ['created_at' => now()->subDays(4), 'status' => 'done', 'completed_at' => now()->subDays(2)]);
    // previous window (7-14d ago): 1 created, 1 completed
    trackerReportIssue($ws, $team, ['created_at' => now()->subDays(10), 'status' => 'done', 'completed_at' => now()->subDays(9)]);
    // cancelled in current window: counts as created, never as completed/active
    trackerReportIssue($ws, $team, ['created_at' => now()->subDays(1), 'status' => 'cancelled']);

    $res = $this->withToken($token)->getJson('/v1/reports/tracker-overview?range=7d')->assertOk();

    expect($res->json('data.kpis.created.value'))->toBe(4);
    expect($res->json('data.kpis.created.delta_pct'))->toBe(300);
    expect($res->json('data.kpis.completed.value'))->toBe(2);
    expect($res->json('data.kpis.completed.delta_pct'))->toBe(100);
    expect($res->json('data.kpis.active.value'))->toBe(1);
    expect($res->json('data.kpis.active.delta_pct'))->toBeNull();
    // median of (subDays(3)→subDays(1)) = 2880 and (subDays(4)→subDays(2)) = 2880
    expect($res->json('data.kpis.median_cycle_time_minutes.value'))->toBe(2880);

    Carbon::setTestNow();
    Workspace::forgetCurrent();
});

it('returns flow buckets, 0-filled breakdowns, and created/completed sparklines', function (): void {
    Carbon::setTestNow('2026-09-09 12:00:00');
    [$token, $ws, $team] = trackerReportWorld();
    trackerReportIssue($ws, $team, ['created_at' => now()->subDays(1), 'status' => 'done', 'completed_at' => now()->subHours(2)]);

    $res = $this->withToken($token)->getJson('/v1/reports/tracker-overview?range=7d')->assertOk();

    expect($res->json('data.flow.labels'))->toHaveCount(7);
    expect($res->json('data.flow.created'))->toHaveCount(7);
    expect($res->json('data.flow.completed'))->toHaveCount(7);
    expect(array_sum($res->json('data.flow.created')))->toBe(1);
    expect(array_sum($res->json('data.flow.completed')))->toBe(1);
    expect($res->json('data.sparklines.created'))->toHaveCount(7);
    expect(collect($res->json('data.by_status'))->pluck('key')->all())
        ->toBe(['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']);
    expect(collect($res->json('data.by_priority'))->pluck('key')->all())
        ->toBe(['no_priority', 'urgent', 'high', 'medium', 'low']);
    expect(collect($res->json('data.by_status'))->firstWhere('key', 'done')['count'])->toBe(1);

    Carbon::setTestNow();
    Workspace::forgetCurrent();
});

it('isolates workspaces', function (): void {
    Carbon::setTestNow('2026-09-09 12:00:00');
    [$token, $ws, $team] = trackerReportWorld();
    trackerReportIssue($ws, $team, ['created_at' => now()->subDays(1)]);

    Workspace::forgetCurrent();
    $other = Workspace::factory()->create();
    test()->actingInWorkspace($other);
    $otherUser = User::factory()->for($other, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);
    $otherToken = app(CreatePersonalAccessToken::class)->handle($otherUser, 't', null)['token'];

    $res = $this->withToken($otherToken)->getJson('/v1/reports/tracker-overview?range=7d')->assertOk();
    expect($res->json('data.kpis.created.value'))->toBe(0);

    Carbon::setTestNow();
    Workspace::forgetCurrent();
});

function trackerReportCycle(Team $team, string $name, int $startOffsetDays, int $endOffsetDays): Cycle
{
    return Cycle::forceCreate([
        'id' => (string) Str::uuid(),
        'team_id' => $team->id,
        'name' => $name,
        'starts_at' => now()->addDays($startOffsetDays)->toDateString(),
        'ends_at' => now()->addDays($endOffsetDays)->toDateString(),
    ]);
}

it('403s the cycles report for an agent-only user', function (): void {
    [$token, $ws, $team] = trackerReportWorld(['is_developer' => false, 'is_agent' => true, 'admin_level' => 'member']);
    $this->withToken($token)->getJson("/v1/reports/cycles?team_id={$team->id}")->assertStatus(403);
    Workspace::forgetCurrent();
});

it('422s a team from another workspace', function (): void {
    [$token, $ws] = trackerReportWorld();
    // RLS-context sandwich: create the foreign team under its own tenant, then
    // restore the acting token's workspace before issuing the request.
    $foreign = Workspace::factory()->create();
    $foreign->makeCurrent();
    $foreignTeam = Team::factory()->for($foreign, 'workspace')->create();
    test()->actingInWorkspace($ws);

    $this->withToken($token)->getJson("/v1/reports/cycles?team_id={$foreignTeam->id}")->assertStatus(422);
    Workspace::forgetCurrent();
});

it('422s a cycle that does not belong to the team', function (): void {
    [$token, $ws, $team] = trackerReportWorld();
    $otherTeam = Team::factory()->for($ws, 'workspace')->create();
    $otherCycle = trackerReportCycle($otherTeam, 'Elsewhere', -7, 7);

    $this->withToken($token)->getJson("/v1/reports/cycles?team_id={$team->id}&cycle_id={$otherCycle->id}")->assertStatus(422);
    Workspace::forgetCurrent();
});

it('returns empty cycles and null burndown for a cycle-less team', function (): void {
    [$token, $ws, $team] = trackerReportWorld();
    $res = $this->withToken($token)->getJson("/v1/reports/cycles?team_id={$team->id}")->assertOk();

    expect($res->json('data.cycles'))->toBe([]);
    expect($res->json('data.burndown'))->toBeNull();
    Workspace::forgetCurrent();
});

it('computes velocity excluding cancelled and defaults to the current cycle', function (): void {
    Carbon::setTestNow('2026-09-09 12:00:00');
    [$token, $ws, $team] = trackerReportWorld();
    $past = trackerReportCycle($team, 'Past', -30, -16);
    $current = trackerReportCycle($team, 'Current', -7, 7);

    trackerReportIssue($ws, $team, ['cycle_id' => $current->id, 'status' => 'done', 'completed_at' => now()->subDays(3)]);
    trackerReportIssue($ws, $team, ['cycle_id' => $current->id, 'status' => 'in_progress']);
    trackerReportIssue($ws, $team, ['cycle_id' => $current->id, 'status' => 'cancelled']);
    trackerReportIssue($ws, $team, ['cycle_id' => $past->id, 'status' => 'done', 'completed_at' => now()->subDays(20)]);

    $res = $this->withToken($token)->getJson("/v1/reports/cycles?team_id={$team->id}")->assertOk();

    $rows = collect($res->json('data.cycles'));
    expect($rows)->toHaveCount(2);
    // newest-first by starts_at
    expect($rows->first()['name'])->toBe('Current');
    expect($rows->first()['completed_count'])->toBe(1);
    expect($rows->first()['total_count'])->toBe(2); // cancelled excluded
    expect($rows->last()['completed_count'])->toBe(1);

    // default cycle = the one containing today
    expect($res->json('data.burndown.name'))->toBe('Current');
    expect($res->json('data.burndown.total_scope'))->toBe(2);

    Carbon::setTestNow();
    Workspace::forgetCurrent();
});

it('computes burndown remaining per day with null future days', function (): void {
    Carbon::setTestNow('2026-09-09 12:00:00');
    [$token, $ws, $team] = trackerReportWorld();
    $cycle = trackerReportCycle($team, 'BD', -4, 3); // 8 calendar days, day 5 (index 4) is today

    trackerReportIssue($ws, $team, ['cycle_id' => $cycle->id, 'status' => 'done', 'completed_at' => now()->subDays(3)->setTime(15, 0)]);
    trackerReportIssue($ws, $team, ['cycle_id' => $cycle->id, 'status' => 'done', 'completed_at' => now()->subDays(1)->setTime(9, 0)]);
    trackerReportIssue($ws, $team, ['cycle_id' => $cycle->id, 'status' => 'todo']);

    $res = $this->withToken($token)->getJson("/v1/reports/cycles?team_id={$team->id}&cycle_id={$cycle->id}")->assertOk();

    $days = $res->json('data.burndown.days');
    expect($days)->toHaveCount(8);
    expect($days[0]['remaining'])->toBe(3);  // day -4: nothing completed yet
    expect($days[1]['remaining'])->toBe(2);  // day -3: first completion (15:00 <= endOfDay)
    expect($days[3]['remaining'])->toBe(1);  // day -1: second completion
    expect($days[4]['remaining'])->toBe(1);  // today
    expect($days[5]['remaining'])->toBeNull(); // future
    expect($days[7]['remaining'])->toBeNull();

    Carbon::setTestNow();
    Workspace::forgetCurrent();
});
