<?php

declare(strict_types=1);

use App\Models\HelpdeskSavedReport;
use App\Models\User;
use App\Models\Workspace;
use App\Repositories\HelpdeskSavedReportRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

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

it('creates a saved report (201) with created_by = the acting agent', function (): void {
    ['workspace' => $ws, 'agent' => $agent] = savedReportWorld();

    $this->actingAs($agent)->withSession(['ensure_valid_tenant_session_tenant_id' => $ws->id])
        ->postJson('/v1/report-views', ['name' => 'Weekly agents', 'definition' => ['section' => 'agents', 'range' => '7d']])
        ->assertStatus(201)
        ->assertJsonPath('data.name', 'Weekly agents')
        ->assertJsonPath('data.created_by', $agent->id)
        ->assertJsonPath('data.definition.section', 'agents')
        ->assertJsonPath('data.definition.range', '7d');
    expect(HelpdeskSavedReport::where('name', 'Weekly agents')->exists())->toBeTrue();
});

it('lists workspace saved reports ordered by name', function (): void {
    ['workspace' => $ws, 'agent' => $agent] = savedReportWorld();
    app(HelpdeskSavedReportRepository::class)->create(['name' => 'Zeta', 'created_by' => $agent->id, 'definition' => ['section' => 'sla', 'range' => '90d']]);
    app(HelpdeskSavedReportRepository::class)->create(['name' => 'Alpha', 'created_by' => $agent->id, 'definition' => ['section' => 'overview', 'range' => '7d']]);

    $this->actingAs($agent)->withSession(['ensure_valid_tenant_session_tenant_id' => $ws->id])
        ->getJson('/v1/report-views')->assertOk()
        ->assertJsonPath('data.0.name', 'Alpha')
        ->assertJsonPath('data.1.name', 'Zeta');
});

it('deletes a saved report (204)', function (): void {
    ['workspace' => $ws, 'agent' => $agent] = savedReportWorld();
    $report = app(HelpdeskSavedReportRepository::class)->create(['name' => 'Temp', 'created_by' => $agent->id, 'definition' => ['section' => 'overview', 'range' => '7d']]);

    $this->actingAs($agent)->withSession(['ensure_valid_tenant_session_tenant_id' => $ws->id])
        ->deleteJson("/v1/report-views/{$report->id}")->assertNoContent();
    expect(HelpdeskSavedReport::find($report->id))->toBeNull();
});

it('does not list another workspace\'s reports and 404s on a cross-workspace delete', function (): void {
    ['workspace' => $wsA, 'agent' => $agentA] = savedReportWorld();
    $reportA = app(HelpdeskSavedReportRepository::class)->create(['name' => 'A-only', 'created_by' => $agentA->id, 'definition' => ['section' => 'overview', 'range' => '7d']]);

    ['workspace' => $wsB, 'agent' => $agentB] = savedReportWorld(); // makes wsB current

    $this->actingAs($agentB)->withSession(['ensure_valid_tenant_session_tenant_id' => $wsB->id])
        ->getJson('/v1/report-views')->assertOk()->assertJsonCount(0, 'data');
    $this->actingAs($agentB)->withSession(['ensure_valid_tenant_session_tenant_id' => $wsB->id])
        ->deleteJson("/v1/report-views/{$reportA->id}")->assertNotFound();
});

it('rejects a non-agent with 403 on list/create/delete', function (): void {
    ['workspace' => $ws] = savedReportWorld();
    $member = User::factory()->for($ws, 'workspace')->create(['is_agent' => false, 'email_verified_at' => now()]);

    $this->actingAs($member)->withSession(['ensure_valid_tenant_session_tenant_id' => $ws->id])
        ->getJson('/v1/report-views')->assertForbidden();
    $this->actingAs($member)->withSession(['ensure_valid_tenant_session_tenant_id' => $ws->id])
        ->postJson('/v1/report-views', ['name' => 'X', 'definition' => ['section' => 'overview', 'range' => '7d']])->assertForbidden();
    $this->actingAs($member)->withSession(['ensure_valid_tenant_session_tenant_id' => $ws->id])
        ->deleteJson('/v1/report-views/'.Str::uuid())->assertForbidden();
});

it('422s on a missing name, an invalid section, and an invalid range', function (): void {
    ['workspace' => $ws, 'agent' => $agent] = savedReportWorld();
    $post = fn (array $body) => $this->actingAs($agent)
        ->withSession(['ensure_valid_tenant_session_tenant_id' => $ws->id])
        ->postJson('/v1/report-views', $body);

    $post(['definition' => ['section' => 'overview', 'range' => '7d']])->assertStatus(422); // no name
    $post(['name' => 'Bad section', 'definition' => ['section' => 'nope', 'range' => '7d']])->assertStatus(422);
    $post(['name' => 'Bad range', 'definition' => ['section' => 'overview', 'range' => '5d']])->assertStatus(422);
});
