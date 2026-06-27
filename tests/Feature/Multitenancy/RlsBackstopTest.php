<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\Scopes\WorkspaceScope;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('hides another workspace rows even when the WorkspaceScope is bypassed (RLS + GUC backstop)', function (): void {
    $a = Workspace::factory()->create();
    $a->makeCurrent();
    $teamA = Team::factory()->for($a, 'workspace')->create();
    $userA = User::factory()->for($a, 'workspace')->create();
    Issue::create(['team_id' => $teamA->id, 'title' => 'A issue', 'created_by' => $userA->id]);
    Workspace::forgetCurrent();

    $b = Workspace::factory()->create();
    $b->makeCurrent();

    // Bypass the application scope entirely — only Postgres RLS (driven by the GUC) protects us now.
    $rows = Issue::withoutGlobalScope(WorkspaceScope::class)->get();

    expect($rows)->toHaveCount(0); // A's issue is invisible because app.current_workspace_id = B
    Workspace::forgetCurrent();
});
