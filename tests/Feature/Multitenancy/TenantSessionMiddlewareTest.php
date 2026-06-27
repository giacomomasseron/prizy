<?php

declare(strict_types=1);

use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('allows a first visit with no prior session (EnsureValidTenantSession stores tenant and passes through)', function (): void {
    $workspace = Workspace::factory()->create();

    // actingInWorkspace calls makeCurrent() so NeedsTenant passes, then
    // EnsureValidTenantSession finds no prior session key → stores it → 200.
    $this->actingInWorkspace($workspace)
        ->get($this->tenantUrl($workspace, '/'))
        ->assertStatus(200);
});

it('rejects a web request whose session was bound to a different tenant (session fixation guard)', function (): void {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    // actingInWorkspace($b) sets B as the current tenant (NeedsTenant passes).
    // withSession seeds the session with workspace A's tenant ID.
    // EnsureValidTenantSession: session-tenant (A) ≠ current-tenant (B) → 401 Unauthorized.
    $this->actingInWorkspace($b)
        ->withSession(['ensure_valid_tenant_session_tenant_id' => $a->id])
        ->get($this->tenantUrl($b, '/'))
        ->assertStatus(401);
});

it('allows a request whose session tenant matches the current host tenant', function (): void {
    $workspace = Workspace::factory()->create();

    // Session already contains this workspace's ID →
    // EnsureValidTenantSession: session-tenant = current-tenant → passes through → 200.
    $this->actingInWorkspace($workspace)
        ->withSession(['ensure_valid_tenant_session_tenant_id' => $workspace->id])
        ->get($this->tenantUrl($workspace, '/'))
        ->assertStatus(200);
});
