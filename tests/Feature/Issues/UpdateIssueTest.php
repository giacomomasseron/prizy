<?php

declare(strict_types=1);

use App\Events\IssueUpdated;
use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Issues\UpdateIssue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Validation\ValidationException;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

function seedIssue(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $team  = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create([
        'team_id' => $team->id, 'created_by' => $actor->id, 'title' => 'Old', 'priority' => 'low',
    ]);

    return [$ws, $actor, $issue];
}

it('updates changed fields and logs one activity per change', function (): void {
    Event::fake([IssueUpdated::class]);
    [$ws, $actor, $issue] = seedIssue();

    app(UpdateIssue::class)->handle($actor, [
        'issue_id' => $issue->id, 'title' => 'New title', 'priority' => 'high',
    ]);

    $this->assertDatabaseHas('issues', ['id' => $issue->id, 'title' => 'New title', 'priority' => 'high']);
    $this->assertDatabaseHas('issue_activities', ['issue_id' => $issue->id, 'type' => 'title_changed', 'from_value' => 'Old', 'to_value' => 'New title']);
    $this->assertDatabaseHas('issue_activities', ['issue_id' => $issue->id, 'type' => 'priority_changed', 'from_value' => 'low', 'to_value' => 'high']);
    Event::assertDispatched(IssueUpdated::class);

    Workspace::forgetCurrent();
});

it('writes no activity for a field set to its current value', function (): void {
    Event::fake([IssueUpdated::class]);
    [$ws, $actor, $issue] = seedIssue();

    app(UpdateIssue::class)->handle($actor, ['issue_id' => $issue->id, 'title' => 'Old']);

    $this->assertDatabaseMissing('issue_activities', ['issue_id' => $issue->id, 'type' => 'title_changed']);

    Workspace::forgetCurrent();
});

it('rejects setting an issue as its own parent', function (): void {
    [$ws, $actor, $issue] = seedIssue();

    expect(fn () => app(UpdateIssue::class)->handle($actor, ['issue_id' => $issue->id, 'parent_issue_id' => $issue->id]))
        ->toThrow(ValidationException::class);

    Workspace::forgetCurrent();
});

it('rejects updating an issue from another workspace', function (): void {
    [$wsA, $actorA, $issueA] = seedIssue();
    Workspace::forgetCurrent();

    $wsB = Workspace::factory()->create();
    $this->actingInWorkspace($wsB);
    $actorB = User::factory()->for($wsB, 'workspace')->create();

    expect(fn () => app(UpdateIssue::class)->handle($actorB, ['issue_id' => $issueA->id, 'title' => 'hack']))
        ->toThrow(ValidationException::class);

    Workspace::forgetCurrent();
});
