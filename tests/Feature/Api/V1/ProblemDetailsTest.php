<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('renders 401 as RFC 7807 problem+json on a v1 route without a token', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);

    $res = $this->getJson('/v1/me');

    $res->assertStatus(401);
    expect($res->headers->get('content-type'))->toContain('application/problem+json');
    $res->assertJson(['type' => 'https://prizy.app/problems/unauthenticated', 'status' => 401, 'title' => 'Unauthorized']);

    Workspace::forgetCurrent();
});

it('renders 404 as problem+json for an unknown v1 route', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);

    $res = $this->getJson('/v1/nope');

    $res->assertStatus(404);
    expect($res->headers->get('content-type'))->toContain('application/problem+json');
    $res->assertJson(['status' => 404]);

    Workspace::forgetCurrent();
});

it('renders 422 validation errors as problem+json with an errors member', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create();

    $res = $this->actingAs($user)->postJson('/v1/auth/tokens', []); // missing required name

    $res->assertStatus(422);
    expect($res->headers->get('content-type'))->toContain('application/problem+json');
    $res->assertJson(['type' => 'https://prizy.app/problems/validation', 'status' => 422]);
    expect($res->json('errors.name'))->toBeArray();

    Workspace::forgetCurrent();
});
