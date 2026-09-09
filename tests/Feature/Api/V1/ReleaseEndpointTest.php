<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Release;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/**
 * @param  array<string,mixed>  $flags
 * @return array{0:string,1:Workspace,2:Team,3:User}
 */
function releaseWorld(array $flags = ['is_developer' => true]): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $flags));
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];
    $team = Team::factory()->for($ws, 'workspace')->create();

    return [$token, $ws, $team, $user];
}

/** @param array<string,mixed> $attrs */
function releaseRow(Workspace $ws, array $attrs = []): Release
{
    return Release::forceCreate(array_merge([
        'id' => (string) Str::uuid(),
        'workspace_id' => $ws->id,
        'name' => 'v1.0.0',
    ], $attrs));
}

/** @param array<string,mixed> $attrs */
function releaseIssue(Workspace $ws, Team $team, User $creator, array $attrs = []): Issue
{
    return Issue::forceCreate(array_merge([
        'id' => (string) Str::uuid(),
        'workspace_id' => $ws->id,
        'team_id' => $team->id,
        'created_by' => $creator->id,
        'title' => 'Release probe',
        'status' => 'todo',
        'priority' => 'medium',
    ], $attrs));
}

it('CRUDs a release as a developer', function (): void {
    [$token, $ws] = releaseWorld();

    $created = $this->withToken($token)->postJson('/v1/releases', [
        'name' => 'v2.0.0', 'description' => 'Big one', 'target_date' => '2026-10-01',
    ])->assertStatus(201)->json('data');
    expect($created['name'])->toBe('v2.0.0');
    expect($created['shipped_at'])->toBeNull();

    $this->withToken($token)->patchJson("/v1/releases/{$created['id']}", ['name' => 'v2.0.1'])
        ->assertOk()->assertJsonPath('data.name', 'v2.0.1');

    $this->withToken($token)->getJson('/v1/releases')->assertOk()
        ->assertJsonPath('data.0.name', 'v2.0.1');

    $this->withToken($token)->deleteJson("/v1/releases/{$created['id']}")->assertNoContent();
    expect(Release::withoutGlobalScopes()->find($created['id']))->toBeNull();

    Workspace::forgetCurrent();
});

it('validates the create payload', function (): void {
    [$token] = releaseWorld();
    $this->withToken($token)->postJson('/v1/releases', ['name' => ''])->assertStatus(422);
    $this->withToken($token)->postJson('/v1/releases', ['name' => 'x', 'target_date' => 'not-a-date'])->assertStatus(422);
    Workspace::forgetCurrent();
});

it('enforces the policy matrix', function (): void {
    // agent-only: list 403
    [$agentToken] = releaseWorld(['is_developer' => false, 'is_agent' => true, 'admin_level' => 'member']);
    $this->withToken($agentToken)->getJson('/v1/releases')->assertStatus(403);
    Workspace::forgetCurrent();
    test()->flushSession();

    // viewer+dev: list 200, create 403
    [$viewerToken] = releaseWorld(['is_developer' => true, 'admin_level' => 'viewer']);
    $this->withToken($viewerToken)->getJson('/v1/releases')->assertOk();
    $this->withToken($viewerToken)->postJson('/v1/releases', ['name' => 'nope'])->assertStatus(403);
    Workspace::forgetCurrent();
    test()->flushSession();

    // owner without dev: create 200 (Gate::before)
    [$ownerToken] = releaseWorld(['is_developer' => false, 'admin_level' => 'owner']);
    $this->withToken($ownerToken)->postJson('/v1/releases', ['name' => 'owner release'])->assertStatus(201);
    Workspace::forgetCurrent();
});

it('ships and unships with 422 guards', function (): void {
    [$token, $ws] = releaseWorld();
    $release = releaseRow($ws);

    $this->withToken($token)->postJson("/v1/releases/{$release->id}/unship")->assertStatus(422);
    $this->withToken($token)->postJson("/v1/releases/{$release->id}/ship")->assertOk();
    expect($release->refresh()->shipped_at)->not->toBeNull();
    $this->withToken($token)->postJson("/v1/releases/{$release->id}/ship")->assertStatus(422);
    $this->withToken($token)->postJson("/v1/releases/{$release->id}/unship")->assertOk();
    expect($release->refresh()->shipped_at)->toBeNull();

    Workspace::forgetCurrent();
});

it('computes the rollup excluding cancelled and nulls pct when empty', function (): void {
    [$token, $ws, $team, $user] = releaseWorld();
    $release = releaseRow($ws);
    releaseIssue($ws, $team, $user, ['release_id' => $release->id, 'status' => 'done']);
    releaseIssue($ws, $team, $user, ['release_id' => $release->id, 'status' => 'in_progress']);
    releaseIssue($ws, $team, $user, ['release_id' => $release->id, 'status' => 'cancelled']);
    $empty = releaseRow($ws, ['name' => 'v0.0.1']);

    $res = $this->withToken($token)->getJson("/v1/releases/{$release->id}")->assertOk();
    expect($res->json('data.rollup'))->toBe(['total' => 3, 'done' => 1, 'cancelled' => 1, 'pct' => 50]);
    expect(collect($res->json('data.by_status'))->pluck('key')->all())
        ->toBe(['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']);
    expect(collect($res->json('data.issues'))->pluck('title'))->toHaveCount(3);
    expect($res->json('data.issues.0.ref'))->toBeString()->toHaveLength(6);

    $emptyRes = $this->withToken($token)->getJson("/v1/releases/{$empty->id}")->assertOk();
    expect($emptyRes->json('data.rollup.pct'))->toBeNull();

    Workspace::forgetCurrent();
});

it('orders the list upcoming-first', function (): void {
    [$token, $ws] = releaseWorld();
    releaseRow($ws, ['name' => 'shipped-old', 'shipped_at' => now()->subDays(5)]);
    releaseRow($ws, ['name' => 'upcoming-late', 'target_date' => now()->addDays(30)->toDateString()]);
    releaseRow($ws, ['name' => 'upcoming-soon', 'target_date' => now()->addDays(3)->toDateString()]);

    $names = collect($this->withToken($token)->getJson('/v1/releases')->assertOk()->json('data'))->pluck('name');
    expect($names->take(2)->all())->toBe(['upcoming-soon', 'upcoming-late']);
    expect($names->last())->toBe('shipped-old');

    Workspace::forgetCurrent();
});

it('isolates workspaces', function (): void {
    [$token, $ws] = releaseWorld();
    releaseRow($ws);
    Workspace::forgetCurrent();
    test()->flushSession();

    [$otherToken] = releaseWorld();
    expect($this->withToken($otherToken)->getJson('/v1/releases')->assertOk()->json('data'))->toBe([]);

    Workspace::forgetCurrent();
});
