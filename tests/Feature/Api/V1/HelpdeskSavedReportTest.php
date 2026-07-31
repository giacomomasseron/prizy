<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use App\Repositories\HelpdeskSavedReportRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * @return array{workspace: Workspace, agent: User}
 */
function savedReportWorld(): array
{
    $workspace = Workspace::factory()->create();
    $workspace->makeCurrent();
    $agent = User::factory()->for($workspace, 'workspace')->create(['is_agent' => true, 'email_verified_at' => now()]);

    return ['workspace' => $workspace, 'agent' => $agent];
}

afterEach(fn () => Workspace::forgetCurrent());

it('creates and lists saved reports ordered by name, workspace-scoped', function (): void {
    ['workspace' => $workspace, 'agent' => $agent] = savedReportWorld();
    $repo = app(HelpdeskSavedReportRepository::class);

    $repo->create(['name' => 'Zeta', 'created_by' => $agent->id, 'definition' => ['section' => 'agents', 'range' => '30d']]);
    $repo->create(['name' => 'Alpha', 'created_by' => $agent->id, 'definition' => ['section' => 'overview', 'range' => '7d']]);

    expect($repo->forWorkspace()->pluck('name')->all())->toBe(['Alpha', 'Zeta']);

    $other = Workspace::factory()->create();
    $other->makeCurrent();
    expect($repo->forWorkspace())->toHaveCount(0);
});
