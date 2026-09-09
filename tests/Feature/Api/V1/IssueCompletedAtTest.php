<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:string,1:Workspace,2:Team} */
function completedAtWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];
    $team = Team::factory()->for($ws, 'workspace')->create();

    return [$token, $ws, $team];
}

function completedAtIssue(string $token, Team $team, string $status = 'todo'): string
{
    $res = test()->withToken($token)->postJson('/v1/issues', [
        'team_id' => $team->id, 'title' => 'Completed-at probe', 'status' => $status,
    ])->assertStatus(201);

    return (string) $res->json('data.id');
}

it('stamps completed_at when an issue transitions into done', function (): void {
    [$token, $ws, $team] = completedAtWorld();
    $id = completedAtIssue($token, $team);

    $this->withToken($token)->putJson("/v1/issues/{$id}/status", ['status' => 'done'])->assertOk();

    expect(Issue::withoutGlobalScopes()->find($id)->completed_at)->not->toBeNull();
    Workspace::forgetCurrent();
});

it('clears completed_at when an issue leaves done', function (): void {
    [$token, $ws, $team] = completedAtWorld();
    $id = completedAtIssue($token, $team);
    $this->withToken($token)->putJson("/v1/issues/{$id}/status", ['status' => 'done'])->assertOk();

    $this->withToken($token)->putJson("/v1/issues/{$id}/status", ['status' => 'in_progress'])->assertOk();

    expect(Issue::withoutGlobalScopes()->find($id)->completed_at)->toBeNull();
    Workspace::forgetCurrent();
});

it('re-stamps completed_at on a later re-done with the newer time', function (): void {
    Carbon::setTestNow('2026-09-01 10:00:00');
    [$token, $ws, $team] = completedAtWorld();
    $id = completedAtIssue($token, $team);
    $this->withToken($token)->putJson("/v1/issues/{$id}/status", ['status' => 'done'])->assertOk();
    $first = Issue::withoutGlobalScopes()->find($id)->completed_at;

    $this->withToken($token)->putJson("/v1/issues/{$id}/status", ['status' => 'todo'])->assertOk();
    Carbon::setTestNow('2026-09-02 10:00:00');
    $this->withToken($token)->putJson("/v1/issues/{$id}/status", ['status' => 'done'])->assertOk();

    expect(Issue::withoutGlobalScopes()->find($id)->completed_at->greaterThan($first))->toBeTrue();
    Carbon::setTestNow();
    Workspace::forgetCurrent();
});

it('stamps completed_at on an issue created directly in done', function (): void {
    [$token, $ws, $team] = completedAtWorld();
    $id = completedAtIssue($token, $team, 'done');

    expect(Issue::withoutGlobalScopes()->find($id)->completed_at)->not->toBeNull();
    Workspace::forgetCurrent();
});

it('never stamps completed_at for cancelled', function (): void {
    [$token, $ws, $team] = completedAtWorld();
    $id = completedAtIssue($token, $team);

    $this->withToken($token)->putJson("/v1/issues/{$id}/status", ['status' => 'cancelled'])->assertOk();

    expect(Issue::withoutGlobalScopes()->find($id)->completed_at)->toBeNull();
    Workspace::forgetCurrent();
});
