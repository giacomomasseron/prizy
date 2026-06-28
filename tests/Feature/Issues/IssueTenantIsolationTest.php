<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Issues\AddCommentToIssue;
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
