<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:string,1:Workspace,2:User} */
function memberWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];
    return [$token, $ws, $user];
}

it('returns only members of the caller workspace', function (): void {
    [$token, $ws, $user] = memberWorld();
    $other = User::factory()->for($ws, 'workspace')->create(['name' => 'Zara']);

    $res = $this->withToken($token)->getJson('/v1/members');
    $res->assertStatus(200);
    $ids = collect($res->json('data'))->pluck('id')->all();
    expect($ids)->toContain($user->id)->toContain($other->id);
    $res->assertJsonStructure(['data' => [['id', 'name']]]);

    Workspace::forgetCurrent();
});

it('cross-workspace isolation: members from another workspace are excluded', function (): void {
    [$token, $ws] = memberWorld();

    // Create workspace B data under wsB's RLS context to satisfy the users-RLS policy,
    // then restore workspace A's context for the HTTP request.
    Workspace::forgetCurrent();
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();
    User::factory()->for($wsB, 'workspace')->create(['name' => 'Outsider']);
    Workspace::forgetCurrent();
    $ws->makeCurrent();

    $res = $this->withToken($token)->getJson('/v1/members');
    $res->assertStatus(200);
    $names = collect($res->json('data'))->pluck('name')->all();
    expect($names)->not->toContain('Outsider');

    Workspace::forgetCurrent();
});

it('requires authentication', function (): void {
    $this->getJson('/v1/members')->assertStatus(401);
});
