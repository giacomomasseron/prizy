<?php

declare(strict_types=1);

use App\Events\IssueAssigned;
use App\Events\IssueCreated;
use App\Events\IssueStatusChanged;
use App\Events\IssueUnblocked;
use App\Events\NotificationCreated;
use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\Repositories\IssueBlockerRepository;
use App\UseCases\Issues\AssignIssue;
use App\UseCases\Issues\CreateIssue;
use App\UseCases\Issues\TransitionIssueStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('records the actor and issue title when creating an issue with an assignee', function (): void {
    Event::fake([IssueCreated::class, IssueAssigned::class, NotificationCreated::class]);
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $assignee = User::factory()->for($ws, 'workspace')->create();
    $team = Team::factory()->for($ws, 'workspace')->create();

    $issue = app(CreateIssue::class)->handle($actor, [
        'team_id' => $team->id, 'title' => 'Ship the enrichment task', 'assignee_id' => $assignee->id,
    ]);

    $this->assertDatabaseHas('notifications', [
        'user_id' => $assignee->id,
        'type' => 'issue_assigned',
        'actor_id' => $actor->id,
        'body' => 'Ship the enrichment task',
        'subject_id' => $issue->id,
    ]);

    Workspace::forgetCurrent();
});

it('records the assigner and issue title when assigning an existing issue', function (): void {
    Event::fake([IssueAssigned::class, NotificationCreated::class]);
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $assignee = User::factory()->for($ws, 'workspace')->create();
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create([
        'team_id' => $team->id, 'created_by' => $actor->id, 'title' => 'Fix the flaky test',
    ]);

    app(AssignIssue::class)->handle($actor, ['issue_id' => $issue->id, 'assignee_id' => $assignee->id]);

    $this->assertDatabaseHas('notifications', [
        'user_id' => $assignee->id,
        'type' => 'issue_assigned',
        'actor_id' => $actor->id,
        'body' => 'Fix the flaky test',
        'subject_id' => $issue->id,
    ]);

    Workspace::forgetCurrent();
});

it('records the completing actor and blocked issue title when a status transition unblocks an issue', function (): void {
    Event::fake([IssueStatusChanged::class, IssueUnblocked::class, NotificationCreated::class]);
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $assignee = User::factory()->for($ws, 'workspace')->create();
    $team = Team::factory()->for($ws, 'workspace')->create();
    $blocking = Issue::factory()->for($ws, 'workspace')->status('in_progress')->create(['team_id' => $team->id, 'created_by' => $actor->id]);
    $blocked = Issue::factory()->for($ws, 'workspace')->create([
        'team_id' => $team->id, 'created_by' => $actor->id, 'assignee_id' => $assignee->id, 'title' => 'Blocked work',
    ]);
    app(IssueBlockerRepository::class)->create($blocking->id, $blocked->id, $actor->id);

    app(TransitionIssueStatus::class)->handle($actor, ['issue_id' => $blocking->id, 'status' => 'done']);

    $this->assertDatabaseHas('notifications', [
        'user_id' => $assignee->id,
        'type' => 'issue_unblocked',
        'actor_id' => $actor->id,
        'body' => 'Blocked work',
        'subject_id' => $blocked->id,
    ]);

    Workspace::forgetCurrent();
});
