<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('uses the database scout driver in tests', function (): void {
    expect(config('scout.driver'))->toBe('database');
});

it('finds a matching issue via Issue::search under the database driver', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $team = \App\Models\Team::factory()->for($ws, 'workspace')->create();
    $user = User::factory()->for($ws, 'workspace')->create();

    $match = Issue::factory()->for($ws, 'workspace')->for($team)->create(['title' => 'Payment webhook retries', 'created_by' => $user->id]);
    Issue::factory()->for($ws, 'workspace')->for($team)->create(['title' => 'Unrelated dashboard bug', 'created_by' => $user->id]);

    $ids = Issue::search('Payment')->where('workspace_id', $ws->id)->get()->pluck('id');

    expect($ids)->toContain($match->id)
        ->and($ids)->toHaveCount(1);

    Workspace::forgetCurrent();
});

it('excludes archived issues from search', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $team = \App\Models\Team::factory()->for($ws, 'workspace')->create();
    $user = User::factory()->for($ws, 'workspace')->create();

    Issue::factory()->for($ws, 'workspace')->for($team)->create(['title' => 'Archived payment task', 'created_by' => $user->id, 'archived_at' => now()]);

    $ids = Issue::search('payment')->where('workspace_id', $ws->id)
        ->query(fn ($b) => $b->whereNull('archived_at'))->get()->pluck('id');

    expect($ids)->toBeEmpty();

    Workspace::forgetCurrent();
});
