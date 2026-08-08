<?php

declare(strict_types=1);

use App\Events\IssueCommented;
use App\Events\NotificationCreated;
use App\Models\Issue;
use App\Models\IssueComment;
use App\Models\Notification;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Issues\AddCommentToIssue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

afterEach(fn () => Workspace::forgetCurrent());

it('notifies the assignee and a prior commenter, but not the actor, with issue_commented', function (): void {
    Event::fake([IssueCommented::class, NotificationCreated::class]);
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);

    $actor = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $assignee = User::factory()->for($ws, 'workspace')->create();
    $priorCommenter = User::factory()->for($ws, 'workspace')->create();
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create([
        'team_id' => $team->id, 'created_by' => $actor->id, 'assignee_id' => $assignee->id,
    ]);
    IssueComment::create(['id' => (string) Str::uuid(), 'issue_id' => $issue->id, 'user_id' => $priorCommenter->id, 'body' => 'earlier remark']);

    $comment = app(AddCommentToIssue::class)->handle($actor, [
        'issue_id' => $issue->id, 'body' => 'Some update here', 'is_internal' => false,
    ]);

    $this->assertDatabaseHas('notifications', [
        'user_id' => $assignee->id, 'type' => 'issue_commented', 'actor_id' => $actor->id,
        'body' => 'Some update here', 'subject_id' => $issue->id,
    ]);
    $this->assertDatabaseHas('notifications', [
        'user_id' => $priorCommenter->id, 'type' => 'issue_commented', 'actor_id' => $actor->id,
        'body' => 'Some update here', 'subject_id' => $issue->id,
    ]);
    $this->assertDatabaseMissing('notifications', ['user_id' => $actor->id, 'subject_id' => $issue->id]);

    Event::assertDispatched(NotificationCreated::class, fn (NotificationCreated $e): bool => $e->userId === $assignee->id && $e->type === 'issue_commented');
    Event::assertDispatched(NotificationCreated::class, fn (NotificationCreated $e): bool => $e->userId === $priorCommenter->id && $e->type === 'issue_commented');
    Event::assertDispatched(IssueCommented::class, fn (IssueCommented $e): bool => $e->comment->id === $comment->id);
});

it('notifies an @-mentioned member with issue_mentioned', function (): void {
    Event::fake([IssueCommented::class, NotificationCreated::class]);
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);

    $actor = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $mentee = User::factory()->for($ws, 'workspace')->create(['name' => 'Jane Doe']);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $actor->id]);

    app(AddCommentToIssue::class)->handle($actor, [
        'issue_id' => $issue->id, 'body' => 'cc @Jane Doe please check', 'is_internal' => false,
    ]);

    $this->assertDatabaseHas('notifications', [
        'user_id' => $mentee->id, 'type' => 'issue_mentioned', 'actor_id' => $actor->id,
        'body' => 'cc @Jane Doe please check', 'subject_id' => $issue->id,
    ]);
    Event::assertDispatched(NotificationCreated::class, fn (NotificationCreated $e): bool => $e->userId === $mentee->id && $e->type === 'issue_mentioned');
});

it('notifies a mentioned participant only once, as a mention, not also as a comment', function (): void {
    Event::fake([IssueCommented::class, NotificationCreated::class]);
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);

    $actor = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $assignee = User::factory()->for($ws, 'workspace')->create(['name' => 'Jane Doe']);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create([
        'team_id' => $team->id, 'created_by' => $actor->id, 'assignee_id' => $assignee->id,
    ]);

    app(AddCommentToIssue::class)->handle($actor, [
        'issue_id' => $issue->id, 'body' => 'cc @Jane Doe, can you take a look?', 'is_internal' => false,
    ]);

    $this->assertDatabaseHas('notifications', ['user_id' => $assignee->id, 'type' => 'issue_mentioned', 'subject_id' => $issue->id]);
    $this->assertDatabaseMissing('notifications', ['user_id' => $assignee->id, 'type' => 'issue_commented', 'subject_id' => $issue->id]);
    expect(Notification::where('user_id', $assignee->id)->where('subject_id', $issue->id)->count())->toBe(1);
});

it('excludes a self-mention from notifications', function (): void {
    Event::fake([IssueCommented::class, NotificationCreated::class]);
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);

    $actor = User::factory()->for($ws, 'workspace')->create(['name' => 'Jane Doe', 'email_verified_at' => now()]);
    $assignee = User::factory()->for($ws, 'workspace')->create();
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create([
        'team_id' => $team->id, 'created_by' => $actor->id, 'assignee_id' => $assignee->id,
    ]);

    app(AddCommentToIssue::class)->handle($actor, [
        'issue_id' => $issue->id, 'body' => 'noting this for myself @Jane Doe', 'is_internal' => false,
    ]);

    $this->assertDatabaseMissing('notifications', ['user_id' => $actor->id, 'subject_id' => $issue->id]);
    // The assignee is still a participant and gets the regular comment notification.
    $this->assertDatabaseHas('notifications', ['user_id' => $assignee->id, 'type' => 'issue_commented', 'subject_id' => $issue->id]);
});

it('still notifies participants for an internal comment', function (): void {
    Event::fake([IssueCommented::class, NotificationCreated::class]);
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);

    $actor = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $assignee = User::factory()->for($ws, 'workspace')->create();
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create([
        'team_id' => $team->id, 'created_by' => $actor->id, 'assignee_id' => $assignee->id,
    ]);

    app(AddCommentToIssue::class)->handle($actor, [
        'issue_id' => $issue->id, 'body' => 'internal note', 'is_internal' => true,
    ]);

    $this->assertDatabaseHas('notifications', ['user_id' => $assignee->id, 'type' => 'issue_commented', 'subject_id' => $issue->id]);
});

it('truncates a long comment body to a 140-char excerpt with an ellipsis', function (): void {
    Event::fake([IssueCommented::class, NotificationCreated::class]);
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);

    $actor = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $assignee = User::factory()->for($ws, 'workspace')->create();
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create([
        'team_id' => $team->id, 'created_by' => $actor->id, 'assignee_id' => $assignee->id,
    ]);

    $body = str_repeat('a', 200);
    $expectedExcerpt = str_repeat('a', 140).'…';

    app(AddCommentToIssue::class)->handle($actor, ['issue_id' => $issue->id, 'body' => $body, 'is_internal' => false]);

    $this->assertDatabaseHas('notifications', [
        'user_id' => $assignee->id, 'type' => 'issue_commented', 'actor_id' => $actor->id,
        'body' => $expectedExcerpt, 'subject_id' => $issue->id,
    ]);
});
