<?php

declare(strict_types=1);

use App\Events\IssueAssigned;
use App\Events\IssueStatusChanged;
use App\Events\IssueUnblocked;
use App\Events\IssueUpdated;
use App\Events\NotificationCreated;
use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

beforeEach(fn () => Event::fake([
    IssueStatusChanged::class,
    IssueAssigned::class,
    IssueUpdated::class,
    IssueUnblocked::class,
    NotificationCreated::class,
]));

/** @return array{0:string,1:Issue,2:User,3:Workspace} */
function lifecycleWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id, 'status' => 'todo']);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $issue, $user, $ws];
}

it('transitions status and returns 200', function (): void {
    [$token, $issue] = lifecycleWorld();

    $res = $this->withToken($token)->putJson("/v1/issues/{$issue->id}/status", ['status' => 'in_progress']);

    $res->assertStatus(200)->assertJson(['data' => ['status' => 'in_progress']]);
    $this->assertDatabaseHas('issue_activities', ['issue_id' => $issue->id, 'type' => 'status_changed']);

    Workspace::forgetCurrent();
});

it('rejects an invalid status enum with 422', function (): void {
    [$token, $issue] = lifecycleWorld();

    $this->withToken($token)->putJson("/v1/issues/{$issue->id}/status", ['status' => 'flying'])->assertStatus(422);

    Workspace::forgetCurrent();
});

it('rejects a no-op transition with 422', function (): void {
    [$token, $issue] = lifecycleWorld();

    $this->withToken($token)->putJson("/v1/issues/{$issue->id}/status", ['status' => 'todo'])->assertStatus(422);

    Workspace::forgetCurrent();
});

it('assigns and unassigns an issue', function (): void {
    [$token, $issue, , $ws] = lifecycleWorld();
    $assignee = User::factory()->for($ws, 'workspace')->create();

    $this->withToken($token)->putJson("/v1/issues/{$issue->id}/assignee", ['assignee_id' => $assignee->id])
        ->assertStatus(200)->assertJson(['data' => ['assignee_id' => $assignee->id]]);

    $this->withToken($token)->putJson("/v1/issues/{$issue->id}/assignee", ['assignee_id' => null])
        ->assertStatus(200)->assertJson(['data' => ['assignee_id' => null]]);

    Workspace::forgetCurrent();
});

it('archives an issue', function (): void {
    [$token, $issue] = lifecycleWorld();

    $res = $this->withToken($token)->postJson("/v1/issues/{$issue->id}/archive");

    $res->assertStatus(200);
    expect($res->json('data.archived_at'))->not->toBeNull();

    Workspace::forgetCurrent();
});
