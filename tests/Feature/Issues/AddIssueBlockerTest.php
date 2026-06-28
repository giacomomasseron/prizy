<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\Repositories\IssueBlockerRepository;
use App\UseCases\Issues\AddIssueBlocker;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0: Workspace, 1: User, 2: callable} */
function blockerWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $team  = Team::factory()->for($ws, 'workspace')->create();
    $make  = fn (string $status = 'todo'): Issue => Issue::factory()->for($ws, 'workspace')
        ->create(['team_id' => $team->id, 'created_by' => $actor->id, 'status' => $status]);

    return [$ws, $actor, $make];
}

it('adds a blocker edge and logs activity on the blocked issue', function (): void {
    [$ws, $actor, $make] = blockerWorld();
    $b = $make();
    $d = $make();

    app(AddIssueBlocker::class)->handle($actor, ['blocking_issue_id' => $b->id, 'blocked_issue_id' => $d->id]);

    $this->assertDatabaseHas('issue_blockers', ['blocking_issue_id' => $b->id, 'blocked_issue_id' => $d->id]);
    $this->assertDatabaseHas('issue_activities', ['issue_id' => $d->id, 'type' => 'blocker_added', 'to_value' => $b->id]);

    Workspace::forgetCurrent();
});

it('rejects a self-block', function (): void {
    [$ws, $actor, $make] = blockerWorld();
    $a = $make();

    expect(fn () => app(AddIssueBlocker::class)->handle($actor, ['blocking_issue_id' => $a->id, 'blocked_issue_id' => $a->id]))
        ->toThrow(ValidationException::class);

    Workspace::forgetCurrent();
});

it('rejects a duplicate edge', function (): void {
    [$ws, $actor, $make] = blockerWorld();
    $b = $make();
    $d = $make();
    app(IssueBlockerRepository::class)->create($b->id, $d->id, $actor->id);

    expect(fn () => app(AddIssueBlocker::class)->handle($actor, ['blocking_issue_id' => $b->id, 'blocked_issue_id' => $d->id]))
        ->toThrow(ValidationException::class);

    Workspace::forgetCurrent();
});

it('rejects an edge touching a done or cancelled issue', function (): void {
    [$ws, $actor, $make] = blockerWorld();
    $done = $make('done');
    $open = $make();

    expect(fn () => app(AddIssueBlocker::class)->handle($actor, ['blocking_issue_id' => $done->id, 'blocked_issue_id' => $open->id]))
        ->toThrow(ValidationException::class);
    expect(fn () => app(AddIssueBlocker::class)->handle($actor, ['blocking_issue_id' => $open->id, 'blocked_issue_id' => $done->id]))
        ->toThrow(ValidationException::class);

    Workspace::forgetCurrent();
});

it('rejects a direct cycle (B blocks D, then D blocks B)', function (): void {
    [$ws, $actor, $make] = blockerWorld();
    $b = $make();
    $d = $make();
    app(IssueBlockerRepository::class)->create($b->id, $d->id, $actor->id); // B blocks D

    expect(fn () => app(AddIssueBlocker::class)->handle($actor, ['blocking_issue_id' => $d->id, 'blocked_issue_id' => $b->id]))
        ->toThrow(ValidationException::class);

    Workspace::forgetCurrent();
});

it('rejects a transitive cycle (A->B->C then C->A)', function (): void {
    [$ws, $actor, $make] = blockerWorld();
    $a = $make();
    $b = $make();
    $c = $make();
    app(IssueBlockerRepository::class)->create($a->id, $b->id, $actor->id); // A blocks B
    app(IssueBlockerRepository::class)->create($b->id, $c->id, $actor->id); // B blocks C

    // Adding C blocks A closes the loop A->B->C->A.
    expect(fn () => app(AddIssueBlocker::class)->handle($actor, ['blocking_issue_id' => $c->id, 'blocked_issue_id' => $a->id]))
        ->toThrow(ValidationException::class);

    Workspace::forgetCurrent();
});
