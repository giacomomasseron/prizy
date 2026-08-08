<?php

declare(strict_types=1);

use App\Events\IssueStatusChanged;
use App\Events\NotificationCreated;
use App\Models\Issue;
use App\Models\IssueComment;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Issues\TransitionIssueStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

afterEach(fn () => Workspace::forgetCurrent());

it('notifies the assignee and a prior commenter, but not the actor, with issue_status_changed', function (): void {
    Event::fake([IssueStatusChanged::class, NotificationCreated::class]);
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);

    $actor = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $assignee = User::factory()->for($ws, 'workspace')->create();
    $priorCommenter = User::factory()->for($ws, 'workspace')->create();
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->status('todo')->create([
        'team_id' => $team->id, 'created_by' => $actor->id, 'assignee_id' => $assignee->id,
    ]);
    IssueComment::create(['id' => (string) Str::uuid(), 'issue_id' => $issue->id, 'user_id' => $priorCommenter->id, 'body' => 'earlier remark']);

    app(TransitionIssueStatus::class)->handle($actor, ['issue_id' => $issue->id, 'status' => 'in_progress']);

    $this->assertDatabaseHas('notifications', [
        'user_id' => $assignee->id, 'type' => 'issue_status_changed', 'actor_id' => $actor->id,
        'body' => '→ In Progress', 'subject_id' => $issue->id,
    ]);
    $this->assertDatabaseHas('notifications', [
        'user_id' => $priorCommenter->id, 'type' => 'issue_status_changed', 'actor_id' => $actor->id,
        'body' => '→ In Progress', 'subject_id' => $issue->id,
    ]);
    $this->assertDatabaseMissing('notifications', ['user_id' => $actor->id, 'subject_id' => $issue->id]);

    Event::assertDispatched(NotificationCreated::class, fn (NotificationCreated $e): bool => $e->userId === $assignee->id && $e->type === 'issue_status_changed');
    Event::assertDispatched(NotificationCreated::class, fn (NotificationCreated $e): bool => $e->userId === $priorCommenter->id && $e->type === 'issue_status_changed');
    Event::assertDispatched(IssueStatusChanged::class, fn (IssueStatusChanged $e): bool => $e->to === 'in_progress');
});

it('does not notify anyone when the issue has no assignee or prior commenters', function (): void {
    Event::fake([IssueStatusChanged::class, NotificationCreated::class]);
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);

    $actor = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->status('todo')->create(['team_id' => $team->id, 'created_by' => $actor->id]);

    app(TransitionIssueStatus::class)->handle($actor, ['issue_id' => $issue->id, 'status' => 'in_review']);

    $this->assertDatabaseMissing('notifications', ['subject_id' => $issue->id]);
    Event::assertNotDispatched(NotificationCreated::class);
});
