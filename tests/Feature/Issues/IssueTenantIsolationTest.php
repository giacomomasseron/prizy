<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\Repositories\IssueBlockerRepository;
use App\UseCases\Issues\AddCommentToIssue;
use App\UseCases\Issues\AddIssueBlocker;
use App\UseCases\Issues\ArchiveIssue;
use App\UseCases\Issues\AssignIssue;
use App\UseCases\Issues\RemoveIssueBlocker;
use App\UseCases\Issues\TransitionIssueStatus;
use App\UseCases\Issues\UpdateIssue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('cannot update, transition, or comment on another workspace issue', function (): void {
    // Workspace A owns the issue.
    $wsA = Workspace::factory()->create();
    $wsA->makeCurrent();
    $actorA = User::factory()->for($wsA, 'workspace')->create();
    $teamA  = Team::factory()->for($wsA, 'workspace')->create();
    $issueA = Issue::factory()->for($wsA, 'workspace')->create(['team_id' => $teamA->id, 'created_by' => $actorA->id]);
    Workspace::forgetCurrent();

    // Workspace B actor tries to reach into A.
    $wsB = Workspace::factory()->create();
    $this->actingInWorkspace($wsB);
    $actorB = User::factory()->for($wsB, 'workspace')->create();

    expect(fn () => app(UpdateIssue::class)->handle($actorB, ['issue_id' => $issueA->id, 'title' => 'hijack']))
        ->toThrow(ValidationException::class);
    expect(fn () => app(TransitionIssueStatus::class)->handle($actorB, ['issue_id' => $issueA->id, 'status' => 'done']))
        ->toThrow(ValidationException::class);
    expect(fn () => app(AddCommentToIssue::class)->handle($actorB, ['issue_id' => $issueA->id, 'body' => 'leak']))
        ->toThrow(ValidationException::class);

    // A's issue is untouched.
    $wsA->makeCurrent();
    expect($issueA->fresh()->title)->not->toBe('hijack');
    Workspace::forgetCurrent();
});

it('cannot add a blocker between workspace-A issues when acting in workspace B', function (): void {
    // Set up workspace A with two issues.
    $wsA = Workspace::factory()->create();
    $wsA->makeCurrent();
    $actorA = User::factory()->for($wsA, 'workspace')->create();
    $teamA  = Team::factory()->for($wsA, 'workspace')->create();
    $issueA1 = Issue::factory()->for($wsA, 'workspace')->create(['team_id' => $teamA->id, 'created_by' => $actorA->id]);
    $issueA2 = Issue::factory()->for($wsA, 'workspace')->create(['team_id' => $teamA->id, 'created_by' => $actorA->id]);
    Workspace::forgetCurrent();

    // Workspace B actor tries to link workspace-A issues.
    $wsB = Workspace::factory()->create();
    $this->actingInWorkspace($wsB);
    $actorB = User::factory()->for($wsB, 'workspace')->create();

    expect(fn () => app(AddIssueBlocker::class)->handle($actorB, [
        'blocking_issue_id' => $issueA1->id,
        'blocked_issue_id'  => $issueA2->id,
    ]))->toThrow(ValidationException::class);

    Workspace::forgetCurrent();
});

it('cannot remove a blocker between workspace-A issues when acting in workspace B', function (): void {
    // Set up workspace A with two issues and an existing blocker edge.
    $wsA = Workspace::factory()->create();
    $wsA->makeCurrent();
    $actorA = User::factory()->for($wsA, 'workspace')->create();
    $teamA  = Team::factory()->for($wsA, 'workspace')->create();
    $issueA1 = Issue::factory()->for($wsA, 'workspace')->create(['team_id' => $teamA->id, 'created_by' => $actorA->id]);
    $issueA2 = Issue::factory()->for($wsA, 'workspace')->create(['team_id' => $teamA->id, 'created_by' => $actorA->id]);
    app(IssueBlockerRepository::class)->create($issueA1->id, $issueA2->id, $actorA->id);
    Workspace::forgetCurrent();

    // Workspace B actor tries to remove the edge.
    $wsB = Workspace::factory()->create();
    $this->actingInWorkspace($wsB);
    $actorB = User::factory()->for($wsB, 'workspace')->create();

    expect(fn () => app(RemoveIssueBlocker::class)->handle($actorB, [
        'blocking_issue_id' => $issueA1->id,
        'blocked_issue_id'  => $issueA2->id,
    ]))->toThrow(ValidationException::class);

    Workspace::forgetCurrent();
});

it('cannot assign a workspace-A issue when acting in workspace B', function (): void {
    // Set up workspace A with an issue.
    $wsA = Workspace::factory()->create();
    $wsA->makeCurrent();
    $actorA = User::factory()->for($wsA, 'workspace')->create();
    $teamA  = Team::factory()->for($wsA, 'workspace')->create();
    $issueA = Issue::factory()->for($wsA, 'workspace')->create(['team_id' => $teamA->id, 'created_by' => $actorA->id]);
    Workspace::forgetCurrent();

    // Workspace B actor tries to assign A's issue.
    $wsB = Workspace::factory()->create();
    $this->actingInWorkspace($wsB);
    $actorB = User::factory()->for($wsB, 'workspace')->create();

    expect(fn () => app(AssignIssue::class)->handle($actorB, [
        'issue_id'    => $issueA->id,
        'assignee_id' => $actorB->id,
    ]))->toThrow(ValidationException::class);

    Workspace::forgetCurrent();
});

it('cannot archive a workspace-A issue when acting in workspace B', function (): void {
    // Set up workspace A with an issue.
    $wsA = Workspace::factory()->create();
    $wsA->makeCurrent();
    $actorA = User::factory()->for($wsA, 'workspace')->create();
    $teamA  = Team::factory()->for($wsA, 'workspace')->create();
    $issueA = Issue::factory()->for($wsA, 'workspace')->create(['team_id' => $teamA->id, 'created_by' => $actorA->id]);
    Workspace::forgetCurrent();

    // Workspace B actor tries to archive A's issue.
    $wsB = Workspace::factory()->create();
    $this->actingInWorkspace($wsB);
    $actorB = User::factory()->for($wsB, 'workspace')->create();

    expect(fn () => app(ArchiveIssue::class)->handle($actorB, ['issue_id' => $issueA->id]))
        ->toThrow(ValidationException::class);

    Workspace::forgetCurrent();
});
