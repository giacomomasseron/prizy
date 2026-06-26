<?php

declare(strict_types=1);

use App\Models\Workspace;
use App\Models\Issue;
use App\Models\Team;
use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

it('scopes issues to the current workspace on create', function (): void {
    $workspace = Workspace::factory()->create();
    $workspace->makeCurrent();
    $team = Team::factory()->for($workspace, 'workspace')->create();
    $user = User::factory()->for($workspace, 'workspace')->create();

    $issue = Issue::create([
        'team_id'    => $team->id,
        'title'      => 'Fix login bug',
        'created_by' => $user->id,
    ]);

    expect($issue->workspace_id)->toBe($workspace->id);
    Workspace::forgetCurrent();
});

it('cannot read issues from another workspace', function (): void {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    $a->makeCurrent();
    $teamA = Team::factory()->for($a, 'workspace')->create();
    $userA = User::factory()->for($a, 'workspace')->create();
    Issue::create(['team_id' => $teamA->id, 'title' => 'A issue', 'created_by' => $userA->id]);
    Workspace::forgetCurrent();

    $b->makeCurrent();
    $teamB = Team::factory()->for($b, 'workspace')->create();
    $userB = User::factory()->for($b, 'workspace')->create();
    Issue::create(['team_id' => $teamB->id, 'title' => 'B issue', 'created_by' => $userB->id]);

    expect(Issue::count())->toBe(1);
    expect(Issue::first()->title)->toBe('B issue');
    Workspace::forgetCurrent();
});
