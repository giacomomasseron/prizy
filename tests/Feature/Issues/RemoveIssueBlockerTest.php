<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\Repositories\IssueBlockerRepository;
use App\UseCases\Issues\RemoveIssueBlocker;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('removes an existing blocker edge and logs activity', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $team  = Team::factory()->for($ws, 'workspace')->create();
    $b = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $actor->id]);
    $d = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $actor->id]);
    app(IssueBlockerRepository::class)->create($b->id, $d->id, $actor->id);

    app(RemoveIssueBlocker::class)->handle($actor, ['blocking_issue_id' => $b->id, 'blocked_issue_id' => $d->id]);

    $this->assertDatabaseMissing('issue_blockers', ['blocking_issue_id' => $b->id, 'blocked_issue_id' => $d->id]);
    $this->assertDatabaseHas('issue_activities', ['issue_id' => $d->id, 'type' => 'blocker_removed', 'to_value' => $b->id]);

    Workspace::forgetCurrent();
});

it('rejects removing a non-existent edge', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create();
    $team  = Team::factory()->for($ws, 'workspace')->create();
    $b = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $actor->id]);
    $d = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $actor->id]);

    expect(fn () => app(RemoveIssueBlocker::class)->handle($actor, ['blocking_issue_id' => $b->id, 'blocked_issue_id' => $d->id]))
        ->toThrow(ValidationException::class);

    Workspace::forgetCurrent();
});
