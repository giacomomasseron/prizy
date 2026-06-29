<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Issues\FindIssue;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('returns an issue in the current workspace', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $user = User::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id]);

    expect(app(FindIssue::class)->handle($issue->id)->id)->toBe($issue->id);

    Workspace::forgetCurrent();
});

it('throws ModelNotFound for a missing or cross-workspace id', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);

    app(FindIssue::class)->handle((string) Str::uuid());
})->throws(ModelNotFoundException::class);
