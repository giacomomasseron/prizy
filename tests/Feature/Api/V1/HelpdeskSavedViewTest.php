<?php

declare(strict_types=1);

use App\Models\HelpdeskSavedView;
use App\Models\User;
use App\Models\Workspace;
use App\Repositories\HelpdeskSavedViewRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

/**
 * @return array{workspace: Workspace, agent: User}
 */
function ticketViewWorld(): array
{
    $workspace = Workspace::factory()->create();
    $workspace->makeCurrent();
    $agent = User::factory()->for($workspace, 'workspace')->create(['is_agent' => true, 'email_verified_at' => now()]);

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

it('creates a saved view (201) with created_by = the acting agent', function (): void {
    ['workspace' => $ws, 'agent' => $agent] = ticketViewWorld();

    $response = $this->actingAs($agent)
        ->withSession(['ensure_valid_tenant_session_tenant_id' => $ws->id])
        ->postJson('/v1/ticket-views', [
            'name' => 'Email backlog',
            'definition' => ['filter' => ['channel' => 'email', 'status' => 'new,open'], 'sort' => 'created_at'],
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'Email backlog')
        ->assertJsonPath('data.created_by', $agent->id)
        ->assertJsonPath('data.definition.sort', 'created_at');
    expect(HelpdeskSavedView::where('name', 'Email backlog')->exists())->toBeTrue();
});

it('lists workspace saved views ordered by name', function (): void {
    ['workspace' => $ws, 'agent' => $agent] = ticketViewWorld();
    app(HelpdeskSavedViewRepository::class)->create(['name' => 'Zeta', 'created_by' => $agent->id, 'definition' => ['filter' => [], 'sort' => 'updated_at']]);
    app(HelpdeskSavedViewRepository::class)->create(['name' => 'Alpha', 'created_by' => $agent->id, 'definition' => ['filter' => [], 'sort' => 'updated_at']]);

    $this->actingAs($agent)->withSession(['ensure_valid_tenant_session_tenant_id' => $ws->id])
        ->getJson('/v1/ticket-views')
        ->assertOk()
        ->assertJsonPath('data.0.name', 'Alpha')
        ->assertJsonPath('data.1.name', 'Zeta');
});

it('deletes a saved view (204)', function (): void {
    ['workspace' => $ws, 'agent' => $agent] = ticketViewWorld();
    $view = app(HelpdeskSavedViewRepository::class)->create(['name' => 'Temp', 'created_by' => $agent->id, 'definition' => ['filter' => [], 'sort' => 'updated_at']]);

    $this->actingAs($agent)->withSession(['ensure_valid_tenant_session_tenant_id' => $ws->id])
        ->deleteJson("/v1/ticket-views/{$view->id}")
        ->assertNoContent();
    expect(HelpdeskSavedView::find($view->id))->toBeNull();
});

it('does not list another workspace\'s views and 404s on a cross-workspace delete', function (): void {
    ['workspace' => $wsA, 'agent' => $agentA] = ticketViewWorld();
    $viewA = app(HelpdeskSavedViewRepository::class)->create(['name' => 'A-only', 'created_by' => $agentA->id, 'definition' => ['filter' => [], 'sort' => 'updated_at']]);

    ['workspace' => $wsB, 'agent' => $agentB] = ticketViewWorld(); // ticketViewWorld() makes wsB current

    $this->actingAs($agentB)->withSession(['ensure_valid_tenant_session_tenant_id' => $wsB->id])
        ->getJson('/v1/ticket-views')->assertOk()->assertJsonCount(0, 'data');

    $this->actingAs($agentB)->withSession(['ensure_valid_tenant_session_tenant_id' => $wsB->id])
        ->deleteJson("/v1/ticket-views/{$viewA->id}")->assertNotFound();
});

it('rejects a non-agent with 403 on list/create/delete', function (): void {
    ['workspace' => $ws] = ticketViewWorld();
    $member = User::factory()->for($ws)->create(['is_agent' => false]);

    $this->actingAs($member)->withSession(['ensure_valid_tenant_session_tenant_id' => $ws->id])
        ->getJson('/v1/ticket-views')->assertForbidden();
    $this->actingAs($member)->withSession(['ensure_valid_tenant_session_tenant_id' => $ws->id])
        ->postJson('/v1/ticket-views', ['name' => 'X', 'definition' => ['filter' => [], 'sort' => 'updated_at']])->assertForbidden();
    $this->actingAs($member)->withSession(['ensure_valid_tenant_session_tenant_id' => $ws->id])
        ->deleteJson('/v1/ticket-views/'.Str::uuid())->assertForbidden();
});

it('422s on a missing name, an unknown filter key, and an invalid sort', function (): void {
    ['workspace' => $ws, 'agent' => $agent] = ticketViewWorld();
    $post = fn (array $body) => $this->actingAs($agent)
        ->withSession(['ensure_valid_tenant_session_tenant_id' => $ws->id])
        ->postJson('/v1/ticket-views', $body);

    $post(['definition' => ['filter' => [], 'sort' => 'updated_at']])->assertStatus(422); // no name
    $post(['name' => 'Bad key', 'definition' => ['filter' => ['project_id' => 'x'], 'sort' => 'updated_at']])->assertStatus(422); // unknown filter key
    $post(['name' => 'Bad sort', 'definition' => ['filter' => [], 'sort' => 'due_date']])->assertStatus(422); // invalid sort
});
