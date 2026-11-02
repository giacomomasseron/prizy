<?php

declare(strict_types=1);

use App\Http\Resources\IssueResource;
use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('serializes the full issue attribute set', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $user = User::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id, 'title' => 'X']);

    $data = (new IssueResource($issue))->toArray(Request::create('/'));

    expect($data)->toHaveKeys(['id', 'title', 'status', 'priority', 'team_id', 'assignee_id', 'created_at']);
    expect($data['title'])->toBe('X');

    Workspace::forgetCurrent();
});

it('honours sparse fieldsets, always keeping id', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $user = User::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id]);

    $request = Request::create('/?fields[issues]=title,status');
    $data = (new IssueResource($issue))->toArray($request);

    expect(array_keys($data))->toEqualCanonicalizing(['id', 'title', 'status']);

    Workspace::forgetCurrent();
});
