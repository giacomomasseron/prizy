<?php

declare(strict_types=1);

use App\Events\IssueUnblocked;
use App\Events\NotificationCreated;
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

/** @param list<object> $events */
function resolveBlockersUnblockedAssignees(array $events): array
{
    return array_values(array_map(
        fn (IssueUnblocked $e): string => $e->assigneeId,
        array_filter($events, fn (object $e): bool => $e instanceof IssueUnblocked),
    ));
}

/** @param list<object> $events */
function resolveBlockersNotifiedTypes(array $events): array
{
    return array_values(array_map(
        fn (NotificationCreated $e): string => $e->type,
        array_filter($events, fn (object $e): bool => $e instanceof NotificationCreated),
    ));
}

it('drops the completed issue as a blocker and notifies a now-fully-unblocked assignee', function (): void {
    Event::fake([IssueUnblocked::class, NotificationCreated::class]);
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create();
    $assignee = User::factory()->for($ws, 'workspace')->create();
    $team = Team::factory()->for($ws, 'workspace')->create();

    $blocking = Issue::factory()->for($ws, 'workspace')->status('done')->create(['team_id' => $team->id, 'created_by' => $actor->id]);
    $blocked = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $actor->id, 'assignee_id' => $assignee->id]);
    app(IssueBlockerRepository::class)->create($blocking->id, $blocked->id, $actor->id);

    $result = ResolveBlockersOnIssueCompleted::run($blocking);

    expect($result['unblocked'])->toBe([$blocked->id]);
    $this->assertDatabaseMissing('issue_blockers', ['blocking_issue_id' => $blocking->id, 'blocked_issue_id' => $blocked->id]);
    $this->assertDatabaseHas('issue_activities', ['issue_id' => $blocked->id, 'type' => 'blocker_resolved', 'from_value' => $blocking->id]);
    $this->assertDatabaseHas('notifications', ['user_id' => $assignee->id, 'type' => 'issue_unblocked', 'subject_id' => $blocked->id]);
    expect(resolveBlockersUnblockedAssignees($result['events']))->toBe([$assignee->id])
        ->and(resolveBlockersNotifiedTypes($result['events']))->toBe(['issue_unblocked']);
    // The broadcasts are handed back, not fired: TransitionIssueStatus fires
    // them once its transaction commits.
    Event::assertNothingDispatched();

    Workspace::forgetCurrent();
});

it('does not notify when the newly-unblocked issue is assigned to the actor who completed the blocker', function (): void {
    Event::fake([IssueUnblocked::class, NotificationCreated::class]);
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create();
    $team = Team::factory()->for($ws, 'workspace')->create();

    $blocking = Issue::factory()->for($ws, 'workspace')->status('done')->create(['team_id' => $team->id, 'created_by' => $actor->id]);
    $blocked = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $actor->id, 'assignee_id' => $actor->id]);
    app(IssueBlockerRepository::class)->create($blocking->id, $blocked->id, $actor->id);

    $result = ResolveBlockersOnIssueCompleted::run($blocking, $actor->id);

    expect($result['unblocked'])->toBe([$blocked->id]);
    $this->assertDatabaseMissing('notifications', ['user_id' => $actor->id, 'type' => 'issue_unblocked', 'subject_id' => $blocked->id]);
    // IssueUnblocked broadcasts on the assignee's private "users.{id}" channel — it's
    // the real-time counterpart of the notification for this path, so it's gated by
    // the same self-exclusion condition (unlike IssueAssigned's workspace-wide channel).
    expect($result['events'])->toBe([]);

    Workspace::forgetCurrent();
});

it('still notifies when the newly-unblocked issue is assigned to a different user than the completing actor', function (): void {
    Event::fake([IssueUnblocked::class, NotificationCreated::class]);
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create();
    $assignee = User::factory()->for($ws, 'workspace')->create();
    $team = Team::factory()->for($ws, 'workspace')->create();

    $blocking = Issue::factory()->for($ws, 'workspace')->status('done')->create(['team_id' => $team->id, 'created_by' => $actor->id]);
    $blocked = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $actor->id, 'assignee_id' => $assignee->id]);
    app(IssueBlockerRepository::class)->create($blocking->id, $blocked->id, $actor->id);

    $result = ResolveBlockersOnIssueCompleted::run($blocking, $actor->id);

    expect($result['unblocked'])->toBe([$blocked->id]);
    $this->assertDatabaseHas('notifications', ['user_id' => $assignee->id, 'type' => 'issue_unblocked', 'subject_id' => $blocked->id]);
    expect(resolveBlockersUnblockedAssignees($result['events']))->toBe([$assignee->id]);

    Workspace::forgetCurrent();
});

it('does not notify when the blocked issue still has another blocker', function (): void {
    Event::fake([IssueUnblocked::class, NotificationCreated::class]);
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create();
    $assignee = User::factory()->for($ws, 'workspace')->create();
    $team = Team::factory()->for($ws, 'workspace')->create();

    $done = Issue::factory()->for($ws, 'workspace')->status('done')->create(['team_id' => $team->id, 'created_by' => $actor->id]);
    $other = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $actor->id]);
    $blocked = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $actor->id, 'assignee_id' => $assignee->id]);
    app(IssueBlockerRepository::class)->create($done->id, $blocked->id, $actor->id);
    app(IssueBlockerRepository::class)->create($other->id, $blocked->id, $actor->id);

    $result = ResolveBlockersOnIssueCompleted::run($done);

    expect($result['unblocked'])->toBe([]);
    $this->assertDatabaseHas('issue_activities', ['issue_id' => $blocked->id, 'type' => 'blocker_resolved']);
    $this->assertDatabaseMissing('notifications', ['user_id' => $assignee->id, 'type' => 'issue_unblocked']);
    expect($result['events'])->toBe([]);

    Workspace::forgetCurrent();
});
