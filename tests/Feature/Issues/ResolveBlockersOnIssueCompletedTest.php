<?php

declare(strict_types=1);

use App\Events\IssueUnblocked;
use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\Repositories\IssueBlockerRepository;
use App\UseCases\Issues\ResolveBlockersOnIssueCompleted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('drops the completed issue as a blocker and notifies a now-fully-unblocked assignee', function (): void {
    Event::fake([IssueUnblocked::class]);
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $actor    = User::factory()->for($ws, 'workspace')->create();
    $assignee = User::factory()->for($ws, 'workspace')->create();
    $team     = Team::factory()->for($ws, 'workspace')->create();

    $blocking = Issue::factory()->for($ws, 'workspace')->status('done')->create(['team_id' => $team->id, 'created_by' => $actor->id]);
    $blocked  = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $actor->id, 'assignee_id' => $assignee->id]);
    app(IssueBlockerRepository::class)->create($blocking->id, $blocked->id, $actor->id);

    $unblocked = app(ResolveBlockersOnIssueCompleted::class)->handle($blocking);

    expect($unblocked)->toBe([$blocked->id]);
    $this->assertDatabaseMissing('issue_blockers', ['blocking_issue_id' => $blocking->id, 'blocked_issue_id' => $blocked->id]);
    $this->assertDatabaseHas('issue_activities', ['issue_id' => $blocked->id, 'type' => 'blocker_resolved', 'from_value' => $blocking->id]);
    $this->assertDatabaseHas('notifications', ['user_id' => $assignee->id, 'type' => 'issue_unblocked', 'subject_id' => $blocked->id]);
    Event::assertDispatched(IssueUnblocked::class, fn (IssueUnblocked $e): bool => $e->assigneeId === $assignee->id);

    Workspace::forgetCurrent();
});

it('does not notify when the blocked issue still has another blocker', function (): void {
    Event::fake([IssueUnblocked::class]);
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $actor    = User::factory()->for($ws, 'workspace')->create();
    $assignee = User::factory()->for($ws, 'workspace')->create();
    $team     = Team::factory()->for($ws, 'workspace')->create();

    $done  = Issue::factory()->for($ws, 'workspace')->status('done')->create(['team_id' => $team->id, 'created_by' => $actor->id]);
    $other = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $actor->id]);
    $blocked = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $actor->id, 'assignee_id' => $assignee->id]);
    app(IssueBlockerRepository::class)->create($done->id, $blocked->id, $actor->id);
    app(IssueBlockerRepository::class)->create($other->id, $blocked->id, $actor->id);

    $unblocked = app(ResolveBlockersOnIssueCompleted::class)->handle($done);

    expect($unblocked)->toBe([]);
    $this->assertDatabaseHas('issue_activities', ['issue_id' => $blocked->id, 'type' => 'blocker_resolved']);
    $this->assertDatabaseMissing('notifications', ['user_id' => $assignee->id, 'type' => 'issue_unblocked']);
    Event::assertNotDispatched(IssueUnblocked::class);

    Workspace::forgetCurrent();
});
