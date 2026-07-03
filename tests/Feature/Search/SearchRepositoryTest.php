<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\Repositories\SearchRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

function seedSearchIssue(Workspace $ws, array $attrs = []): Issue
{
    $team = Team::factory()->for($ws, 'workspace')->create();
    $user = User::factory()->for($ws, 'workspace')->create();

    return Issue::factory()->for($ws, 'workspace')->for($team)->create(array_merge(
        ['created_by' => $user->id],
        $attrs,
    ));
}

it('returns only the current workspace matches (tenancy)', function (): void {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    $a->makeCurrent();
    $mine = seedSearchIssue($a, ['title' => 'Payment webhook retries']);
    Workspace::forgetCurrent();

    $b->makeCurrent();
    seedSearchIssue($b, ['title' => 'Payment webhook retries']);
    Workspace::forgetCurrent();

    $a->makeCurrent();
    $page = app(SearchRepository::class)->searchIssues($a->id, 'Payment', [], 1, 15);
    Workspace::forgetCurrent();

    expect($page->pluck('id')->all())->toBe([$mine->id]);
});

it('excludes archived issues by default', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    seedSearchIssue($ws, ['title' => 'Archived payment', 'archived_at' => now()]);
    $active = seedSearchIssue($ws, ['title' => 'Active payment']);

    $page = app(SearchRepository::class)->searchIssues($ws->id, 'payment', [], 1, 15);
    Workspace::forgetCurrent();

    expect($page->pluck('id')->all())->toBe([$active->id]);
});

it('filters by status and team', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $wanted = seedSearchIssue($ws, ['title' => 'Payment done', 'status' => 'done']);
    seedSearchIssue($ws, ['title' => 'Payment todo', 'status' => 'todo']);

    $page = app(SearchRepository::class)->searchIssues($ws->id, 'Payment', ['status' => 'done'], 1, 15);
    Workspace::forgetCurrent();

    expect($page->pluck('id')->all())->toBe([$wanted->id]);
});

it('caps results for the palette', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    foreach (range(1, 5) as $i) {
        seedSearchIssue($ws, ['title' => "Payment item {$i}"]);
    }

    $capped = app(SearchRepository::class)->searchIssuesCapped($ws->id, 'Payment', 3);
    Workspace::forgetCurrent();

    expect($capped)->toHaveCount(3);
});
