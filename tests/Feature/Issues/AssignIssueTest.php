<?php

declare(strict_types=1);

use App\Events\IssueAssigned;
use App\Events\NotificationCreated;
use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Issues\AssignIssue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Validation\ValidationException;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('assigns an issue, logs activity, notifies and broadcasts', function (): void {
    Event::fake([IssueAssigned::class, NotificationCreated::class]);
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $actor    = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $assignee = User::factory()->for($ws, 'workspace')->create();
    $team     = Team::factory()->for($ws, 'workspace')->create();
    $issue    = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $actor->id]);

    app(AssignIssue::class)->handle($actor, ['issue_id' => $issue->id, 'assignee_id' => $assignee->id]);

    $this->assertDatabaseHas('issues', ['id' => $issue->id, 'assignee_id' => $assignee->id]);
    $this->assertDatabaseHas('issue_activities', ['issue_id' => $issue->id, 'type' => 'assigned', 'to_value' => $assignee->id]);
    $this->assertDatabaseHas('notifications', ['user_id' => $assignee->id, 'type' => 'issue_assigned', 'subject_id' => $issue->id]);
    Event::assertDispatched(IssueAssigned::class, fn (IssueAssigned $e): bool => $e->assigneeId === $assignee->id);

    Workspace::forgetCurrent();
});

it('unassigns an issue (null assignee) without a notification', function (): void {
    Event::fake([IssueAssigned::class, NotificationCreated::class]);
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $actor    = User::factory()->for($ws, 'workspace')->create();
    $assignee = User::factory()->for($ws, 'workspace')->create();
    $team     = Team::factory()->for($ws, 'workspace')->create();
    $issue    = Issue::factory()->for($ws, 'workspace')->create([
        'team_id' => $team->id, 'created_by' => $actor->id, 'assignee_id' => $assignee->id,
    ]);

    app(AssignIssue::class)->handle($actor, ['issue_id' => $issue->id, 'assignee_id' => null]);

    $this->assertDatabaseHas('issues', ['id' => $issue->id, 'assignee_id' => null]);
    $this->assertDatabaseHas('issue_activities', ['issue_id' => $issue->id, 'type' => 'assigned', 'from_value' => $assignee->id]);
    Event::assertDispatched(IssueAssigned::class, fn (IssueAssigned $e): bool => $e->assigneeId === null);

    Workspace::forgetCurrent();
});

it('rejects an assignee from another workspace', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create();
    $team  = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $actor->id]);

    expect(fn () => app(AssignIssue::class)->handle($actor, ['issue_id' => $issue->id, 'assignee_id' => (string) \Illuminate\Support\Str::uuid()]))
        ->toThrow(ValidationException::class);

    Workspace::forgetCurrent();
});
