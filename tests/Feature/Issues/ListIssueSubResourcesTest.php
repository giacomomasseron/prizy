<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\IssueActivity;
use App\Models\IssueComment;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Issues\ListIssueActivities;
use App\UseCases\Issues\ListIssueComments;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('lists comments for an issue, cursor-paginated', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $user = User::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id]);

    foreach (range(1, 3) as $i) {
        IssueComment::create([
            'id' => (string) Str::uuid(), 'issue_id' => $issue->id, 'user_id' => $user->id, 'body' => "c{$i}",
        ]);
    }

    $page = app(ListIssueComments::class)->handle($issue->id, 2);
    expect($page->count())->toBe(2);
    expect($page->hasMorePages())->toBeTrue();

    Workspace::forgetCurrent();
});

it('lists activities for an issue', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $user = User::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id]);

    IssueActivity::create([
        'id' => (string) Str::uuid(), 'issue_id' => $issue->id, 'user_id' => $user->id, 'type' => 'created',
    ]);

    $page = app(ListIssueActivities::class)->handle($issue->id, 25);
    expect($page->count())->toBe(1);

    Workspace::forgetCurrent();
});
