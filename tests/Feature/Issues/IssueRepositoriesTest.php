<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\Repositories\IssueActivityRepository;
use App\Repositories\IssueRepository;
use App\Repositories\NotificationRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('creates an issue with a PHP uuid and workspace auto-filled', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $user = User::factory()->for($ws, 'workspace')->create();

    $issue = app(IssueRepository::class)->create([
        'team_id'    => $team->id,
        'title'      => 'First issue',
        'created_by' => $user->id,
    ]);

    expect($issue->id)->toBeString()->not->toBeEmpty();
    expect($issue->workspace_id)->toBe($ws->id);
    $this->assertDatabaseHas('issues', ['id' => $issue->id, 'workspace_id' => $ws->id, 'title' => 'First issue']);

    expect(app(IssueRepository::class)->findInWorkspace($issue->id)->id)->toBe($issue->id);

    Workspace::forgetCurrent();
});

it('logs an activity row', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $user = User::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id]);

    $activity = app(IssueActivityRepository::class)->log($issue->id, $user->id, 'created', null, 'First issue');

    expect($activity->id)->toBeString()->not->toBeEmpty();
    $this->assertDatabaseHas('issue_activities', [
        'issue_id' => $issue->id, 'user_id' => $user->id, 'type' => 'created', 'to_value' => 'First issue',
    ]);

    Workspace::forgetCurrent();
});

it('creates a notification with workspace auto-filled', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $user  = User::factory()->for($ws, 'workspace')->create();
    $team  = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id]);

    $notification = app(NotificationRepository::class)->create($user->id, 'issue_assigned', 'issue', $issue->id);

    $this->assertDatabaseHas('notifications', [
        'id' => $notification->id, 'workspace_id' => $ws->id, 'user_id' => $user->id,
        'type' => 'issue_assigned', 'subject_type' => 'issue', 'subject_id' => $issue->id,
    ]);

    Workspace::forgetCurrent();
});
