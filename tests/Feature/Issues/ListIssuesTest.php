<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Issues\ListIssues;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

function listWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $user = User::factory()->for($ws, 'workspace')->create();
    $make = fn (array $attrs = []): Issue => Issue::factory()->for($ws, 'workspace')
        ->create(array_merge(['team_id' => $team->id, 'created_by' => $user->id], $attrs));

    return [$ws, $make];
}

it('filters by status (CSV ⇒ IN)', function (): void {
    [$ws, $make] = listWorld();
    $make(['status' => 'todo']);
    $make(['status' => 'in_progress']);
    $make(['status' => 'done']);

    $page = app(ListIssues::class)->handle(['status' => 'todo,in_progress'], [['column' => 'created_at', 'dir' => 'asc']], 25);

    expect($page->count())->toBe(2);

    Workspace::forgetCurrent();
});

it('excludes archived by default and includes them with archived=true', function (): void {
    [$ws, $make] = listWorld();
    $make(['status' => 'todo']);
    $make(['status' => 'todo', 'archived_at' => now()]);

    $active = app(ListIssues::class)->handle([], [['column' => 'created_at', 'dir' => 'asc']], 25);
    expect($active->count())->toBe(1);

    $archived = app(ListIssues::class)->handle(['archived' => 'true'], [['column' => 'created_at', 'dir' => 'asc']], 25);
    expect($archived->count())->toBe(1);

    $all = app(ListIssues::class)->handle(['archived' => 'all'], [['column' => 'created_at', 'dir' => 'asc']], 25);
    expect($all->count())->toBe(2);

    Workspace::forgetCurrent();
});

it('cursor-paginates with a stable limit', function (): void {
    [$ws, $make] = listWorld();
    foreach (range(1, 3) as $i) {
        $make(['status' => 'todo']);
    }

    $page = app(ListIssues::class)->handle([], [['column' => 'created_at', 'dir' => 'asc']], 2);

    expect($page->count())->toBe(2);
    expect($page->hasMorePages())->toBeTrue();

    Workspace::forgetCurrent();
});
