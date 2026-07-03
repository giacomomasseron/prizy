<?php

declare(strict_types=1);

use App\Events\IssueAssigned;
use App\Events\NotificationCreated;
use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Issues\AssignIssue;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('builds a private per-user channel + scalar payload', function (): void {
    $event = new NotificationCreated('user-1', 'notif-1', 'issue_assigned');
    expect($event->broadcastOn())->toHaveCount(1);
    expect($event->broadcastOn()[0])->toBeInstanceOf(PrivateChannel::class);
    expect($event->broadcastOn()[0]->name)->toBe('private-users.user-1');
    expect($event->broadcastAs())->toBe('NotificationCreated');
    expect($event->broadcastWith())->toBe(['id' => 'notif-1', 'type' => 'issue_assigned']);
});

it('dispatches NotificationCreated for the assignee when an issue is assigned', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $actor    = User::factory()->for($ws, 'workspace')->create(['is_developer' => true]);
    $assignee = User::factory()->for($ws, 'workspace')->create();
    $team     = Team::factory()->for($ws, 'workspace')->create();
    $issue    = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $actor->id, 'assignee_id' => null]);

    Event::fake([NotificationCreated::class, IssueAssigned::class]); // Fake broadcast events only — workspace-fill observer stays live

    app(AssignIssue::class)->handle($actor, ['issue_id' => $issue->id, 'assignee_id' => $assignee->id]);

    Event::assertDispatched(NotificationCreated::class, fn (NotificationCreated $e): bool =>
        $e->userId === $assignee->id && $e->type === 'issue_assigned' && $e->id !== '');

    Workspace::forgetCurrent();
});
