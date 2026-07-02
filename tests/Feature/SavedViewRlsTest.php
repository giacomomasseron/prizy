<?php

declare(strict_types=1);

use App\Models\SavedView;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('persists a saved view with a JSON definition and isolates it by workspace (RLS)', function (): void {
    $wsA = Workspace::factory()->create();
    $wsA->makeCurrent();
    $userA = User::factory()->for($wsA, 'workspace')->create();
    $view = SavedView::create([
        'id' => (string) Str::uuid(),
        'name' => 'My Bugs',
        'created_by' => $userA->id,
        'definition' => ['filter' => ['status' => 'todo'], 'sort' => '-created_at', 'view_type' => 'list'],
    ]);
    expect($view->definition['view_type'])->toBe('list');
    expect(SavedView::count())->toBe(1);
    Workspace::forgetCurrent();

    // Workspace B cannot see workspace A's saved view (RLS + WorkspaceScope).
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();
    expect(SavedView::count())->toBe(0);
    expect(SavedView::find($view->id))->toBeNull();
    Workspace::forgetCurrent();
});
