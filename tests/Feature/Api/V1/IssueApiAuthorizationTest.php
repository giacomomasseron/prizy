<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('rejects requests without a token (401 problem+json)', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);

    $res = $this->getJson('/v1/issues');
    $res->assertStatus(401);
    expect($res->headers->get('content-type'))->toContain('application/problem+json');

    Workspace::forgetCurrent();
});

it('a token for workspace A cannot read or mutate workspace B issues (404)', function (): void {
    // Workspace B owns the issue.
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();
    $userB = User::factory()->for($wsB, 'workspace')->create(['is_developer' => true]);
    $teamB = Team::factory()->for($wsB, 'workspace')->create();
    $issueB = Issue::factory()->for($wsB, 'workspace')->create(['team_id' => $teamB->id, 'created_by' => $userB->id]);
    Workspace::forgetCurrent();

    // Workspace A token.
    $wsA = Workspace::factory()->create();
    $this->actingInWorkspace($wsA);
    $userA = User::factory()->for($wsA, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);
    $tokenA = app(CreatePersonalAccessToken::class)->handle($userA, 't', null)['token'];

    $this->withToken($tokenA)->getJson("/v1/issues/{$issueB->id}")->assertStatus(404);
    $this->withToken($tokenA)->patchJson("/v1/issues/{$issueB->id}", ['title' => 'hijack'])->assertStatus(404);
    $this->withToken($tokenA)->postJson("/v1/issues/{$issueB->id}/comments", ['body' => 'leak'])->assertStatus(404);

    Workspace::forgetCurrent();
});

it('a viewer / non-developer cannot create or mutate (403)', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $viewer = User::factory()->for($ws, 'workspace')->create([
        'email_verified_at' => now(), 'admin_level' => 'viewer', 'is_developer' => false,
    ]);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $dev = User::factory()->for($ws, 'workspace')->create(['is_developer' => true]);
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $dev->id]);
    $token = app(CreatePersonalAccessToken::class)->handle($viewer, 't', null)['token'];

    $this->withToken($token)->postJson('/v1/issues', ['team_id' => $team->id, 'title' => 'X'])->assertStatus(403);
    $this->withToken($token)->patchJson("/v1/issues/{$issue->id}", ['title' => 'Y'])->assertStatus(403);

    // But a viewer CAN read.
    $this->withToken($token)->getJson("/v1/issues/{$issue->id}")->assertStatus(200);

    Workspace::forgetCurrent();
});

it('an unverified developer cannot write (403) but can read (200)', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => null, 'is_developer' => true]);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    $this->withToken($token)->postJson('/v1/issues', ['team_id' => $team->id, 'title' => 'X'])->assertStatus(403);
    $this->withToken($token)->getJson("/v1/issues/{$issue->id}")->assertStatus(200);

    Workspace::forgetCurrent();
});
