<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\Repositories\IssueBlockerRepository;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:string,1:callable,2:User} */
function blockerApiWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];
    $make = fn (): Issue => Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id, 'status' => 'todo']);

    return [$token, $make, $user];
}

it('adds a blocker (201) and removes it (204)', function (): void {
    [$token, $make] = blockerApiWorld();
    $blocked = $make();
    $blocking = $make();

    $this->withToken($token)->postJson("/v1/issues/{$blocked->id}/blockers", ['blocking_issue_id' => $blocking->id])
        ->assertStatus(201);
    $this->assertDatabaseHas('issue_blockers', ['blocking_issue_id' => $blocking->id, 'blocked_issue_id' => $blocked->id]);

    $this->withToken($token)->deleteJson("/v1/issues/{$blocked->id}/blockers/{$blocking->id}")
        ->assertStatus(204);
    $this->assertDatabaseMissing('issue_blockers', ['blocking_issue_id' => $blocking->id, 'blocked_issue_id' => $blocked->id]);

    Workspace::forgetCurrent();
});

it('rejects a self-block with 422', function (): void {
    [$token, $make] = blockerApiWorld();
    $a = $make();

    $this->withToken($token)->postJson("/v1/issues/{$a->id}/blockers", ['blocking_issue_id' => $a->id])
        ->assertStatus(422);

    Workspace::forgetCurrent();
});

it('returns 501 for the ticket-links stub', function (): void {
    [$token, $make] = blockerApiWorld();
    $issue = $make();

    $res = $this->withToken($token)->postJson("/v1/issues/{$issue->id}/ticket-links", ['ticket_id' => 'x']);

    $res->assertStatus(501);
    expect($res->headers->get('content-type'))->toContain('application/problem+json');

    Workspace::forgetCurrent();
});
