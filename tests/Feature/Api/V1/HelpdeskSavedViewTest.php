<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use App\Repositories\HelpdeskSavedViewRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * @return array{workspace: Workspace, agent: User}
 */
function ticketViewWorld(): array
{
    $workspace = Workspace::factory()->create();
    $workspace->makeCurrent();
    $agent = User::factory()->for($workspace, 'workspace')->create(['is_agent' => true]);

    return ['workspace' => $workspace, 'agent' => $agent];
}

afterEach(fn () => Workspace::forgetCurrent());

it('creates and lists saved views ordered by name, workspace-scoped', function (): void {
    ['workspace' => $workspace, 'agent' => $agent] = ticketViewWorld();
    $repo = app(HelpdeskSavedViewRepository::class);

    $repo->create(['name' => 'Zeta', 'created_by' => $agent->id, 'definition' => ['filter' => ['status' => 'open'], 'sort' => 'priority']]);
    $repo->create(['name' => 'Alpha', 'created_by' => $agent->id, 'definition' => ['filter' => [], 'sort' => 'updated_at']]);

    $names = $repo->forWorkspace()->pluck('name')->all();
    expect($names)->toBe(['Alpha', 'Zeta']);

    // A second workspace's views are invisible.
    $other = Workspace::factory()->create();
    $other->makeCurrent();
    expect($repo->forWorkspace())->toHaveCount(0);
});
