<?php

declare(strict_types=1);

use App\Events\IssueUpdated;
use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Issues\ArchiveIssue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('archives an issue once and is idempotent on repeat', function (): void {
    Event::fake([IssueUpdated::class]);
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $team  = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $actor->id]);

    app(ArchiveIssue::class)->handle($actor, ['issue_id' => $issue->id]);
    expect($issue->fresh()->archived_at)->not->toBeNull();
    $this->assertDatabaseHas('issue_activities', ['issue_id' => $issue->id, 'type' => 'archived']);

    // Repeat: no second activity row, no error.
    app(ArchiveIssue::class)->handle($actor, ['issue_id' => $issue->id]);
    expect(\App\Models\IssueActivity::where('issue_id', $issue->id)->where('type', 'archived')->count())->toBe(1);

    Workspace::forgetCurrent();
});
