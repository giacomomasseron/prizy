<?php

declare(strict_types=1);

use App\Events\IssueAssigned;
use App\Events\IssueCreated;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Issues\CreateIssue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

function makeWorkspaceWithActor(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $team  = Team::factory()->for($ws, 'workspace')->create();

    return [$ws, $actor, $team];
}

it('creates an issue, writes a created activity, and broadcasts IssueCreated', function (): void {
    Event::fake([IssueCreated::class, IssueAssigned::class]);
    [$ws, $actor, $team] = makeWorkspaceWithActor();

    $issue = app(CreateIssue::class)->handle($actor, ['team_id' => $team->id, 'title' => 'Build login']);

    expect($issue->created_by)->toBe($actor->id);
    expect($issue->status)->toBe('backlog'); // DB default
    $this->assertDatabaseHas('issues', ['id' => $issue->id, 'title' => 'Build login', 'workspace_id' => $ws->id]);
    $this->assertDatabaseHas('issue_activities', ['issue_id' => $issue->id, 'type' => 'created']);

    Event::assertDispatched(IssueCreated::class, fn (IssueCreated $e): bool => $e->issue->id === $issue->id);
    Event::assertNotDispatched(IssueAssigned::class);

    Workspace::forgetCurrent();
});

it('notifies and broadcasts assignment when created with an assignee', function (): void {
    Event::fake([IssueCreated::class, IssueAssigned::class]);
    [$ws, $actor, $team] = makeWorkspaceWithActor();
    $assignee = User::factory()->for($ws, 'workspace')->create();

    $issue = app(CreateIssue::class)->handle($actor, [
        'team_id' => $team->id, 'title' => 'Assigned issue', 'assignee_id' => $assignee->id,
    ]);

    $this->assertDatabaseHas('notifications', [
        'user_id' => $assignee->id, 'type' => 'issue_assigned', 'subject_type' => 'issue', 'subject_id' => $issue->id,
    ]);
    Event::assertDispatched(IssueAssigned::class, fn (IssueAssigned $e): bool => $e->assigneeId === $assignee->id);

    Workspace::forgetCurrent();
});

it('rejects a team from another workspace', function (): void {
    [$ws, $actor, $team] = makeWorkspaceWithActor();

    expect(fn () => app(CreateIssue::class)->handle($actor, ['team_id' => (string) Str::uuid(), 'title' => 'x']))
        ->toThrow(ValidationException::class);

    Workspace::forgetCurrent();
});

it('rejects an assignee from another workspace', function (): void {
    [$ws, $actor, $team] = makeWorkspaceWithActor();

    expect(fn () => app(CreateIssue::class)->handle($actor, [
        'team_id' => $team->id, 'title' => 'x', 'assignee_id' => (string) Str::uuid(),
    ]))->toThrow(ValidationException::class);

    Workspace::forgetCurrent();
});

it('rejects a project_id not in the workspace', function (): void {
    [$ws, $actor, $team] = makeWorkspaceWithActor();

    expect(fn () => app(CreateIssue::class)->handle($actor, [
        'team_id'    => $team->id,
        'title'      => 'x',
        'project_id' => (string) Str::uuid(),
    ]))->toThrow(ValidationException::class);

    Workspace::forgetCurrent();
});

it('rejects a cycle_id not in the workspace', function (): void {
    [$ws, $actor, $team] = makeWorkspaceWithActor();

    expect(fn () => app(CreateIssue::class)->handle($actor, [
        'team_id'  => $team->id,
        'title'    => 'x',
        'cycle_id' => (string) Str::uuid(),
    ]))->toThrow(ValidationException::class);

    Workspace::forgetCurrent();
});
