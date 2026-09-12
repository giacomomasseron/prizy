<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('serves the SPA shell on the workspace host', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);

    $this->get('/login')->assertStatus(200)->assertSee('id="app"', false);

    Workspace::forgetCurrent();
});

it('serves the SPA shell for the KB authoring routes (HC-4)', function (): void {
    // Cheap tripwire for the routes/web.php gap the kb-authoring e2e spec caught: router.tsx has
    // carried the /support/kb* client routes since Task 4, but nothing registered matching
    // Route::view(..., 'app') entries, so a direct navigation (bookmark, refresh, or the e2e
    // spec's page.goto) 404'd before React Router ever ran. Session-auth pattern matches
    // SessionAuthTest.php; is_agent matches what RequireAgent expects client-side (the server
    // route itself carries no auth gate, same as /support/tickets/{ticket} and /support/reporting
    // above, so a signed-in agent here proves the route exists without asserting more than that).
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $agent = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_agent' => true]);

    $this->actingAs($agent)->get('/support/kb')->assertStatus(200)->assertSee('id="app"', false);
    $this->actingAs($agent)->get('/support/kb/new')->assertStatus(200)->assertSee('id="app"', false);
    $this->actingAs($agent)->get('/support/kb/articles/'.(string) Str::uuid())->assertStatus(200)->assertSee('id="app"', false);

    Workspace::forgetCurrent();
});

it('serves the SPA shell on the landlord host for /signup (no tenant)', function (): void {
    // No actingInWorkspace — /signup must be reachable on the base/landlord host
    // without a tenant being resolved (NeedsTenant bypassed).
    $this->get('/signup')->assertStatus(200)->assertSee('id="app"', false);
});
