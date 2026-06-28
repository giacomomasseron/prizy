<?php

declare(strict_types=1);

use App\Events\IssueStatusChanged;
use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\Repositories\IssueBlockerRepository;
use App\UseCases\Issues\TransitionIssueStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Validation\ValidationException;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('transitions status, logs activity, and broadcasts', function (): void {
    Event::fake([IssueStatusChanged::class]);
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $team  = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->status('todo')->create(['team_id' => $team->id, 'created_by' => $actor->id]);

    app(TransitionIssueStatus::class)->handle($actor, ['issue_id' => $issue->id, 'status' => 'in_progress']);

    $this->assertDatabaseHas('issues', ['id' => $issue->id, 'status' => 'in_progress']);
    $this->assertDatabaseHas('issue_activities', ['issue_id' => $issue->id, 'type' => 'status_changed', 'from_value' => 'todo', 'to_value' => 'in_progress']);
    Event::assertDispatched(IssueStatusChanged::class, fn (IssueStatusChanged $e): bool => $e->to === 'in_progress');

    Workspace::forgetCurrent();
});

it('rejects a no-op transition', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create();
    $team  = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->status('todo')->create(['team_id' => $team->id, 'created_by' => $actor->id]);

    expect(fn () => app(TransitionIssueStatus::class)->handle($actor, ['issue_id' => $issue->id, 'status' => 'todo']))
        ->toThrow(ValidationException::class);

    Workspace::forgetCurrent();
});

it('rejects an invalid status value', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create();
    $team  = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->status('todo')->create(['team_id' => $team->id, 'created_by' => $actor->id]);

    expect(fn () => app(TransitionIssueStatus::class)->handle($actor, ['issue_id' => $issue->id, 'status' => 'flying']))
        ->toThrow(ValidationException::class);

    Workspace::forgetCurrent();
});

it('resolves blockers when transitioning to done', function (): void {
    Event::fake([IssueStatusChanged::class, \App\Events\IssueUnblocked::class]);
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $actor    = User::factory()->for($ws, 'workspace')->create();
    $assignee = User::factory()->for($ws, 'workspace')->create();
    $team     = Team::factory()->for($ws, 'workspace')->create();
    $blocking = Issue::factory()->for($ws, 'workspace')->status('in_progress')->create(['team_id' => $team->id, 'created_by' => $actor->id]);
    $blocked  = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $actor->id, 'assignee_id' => $assignee->id]);
    app(IssueBlockerRepository::class)->create($blocking->id, $blocked->id, $actor->id);

    app(TransitionIssueStatus::class)->handle($actor, ['issue_id' => $blocking->id, 'status' => 'done']);

    $this->assertDatabaseMissing('issue_blockers', ['blocking_issue_id' => $blocking->id, 'blocked_issue_id' => $blocked->id]);
    $this->assertDatabaseHas('notifications', ['user_id' => $assignee->id, 'type' => 'issue_unblocked', 'subject_id' => $blocked->id]);

    Workspace::forgetCurrent();
});
