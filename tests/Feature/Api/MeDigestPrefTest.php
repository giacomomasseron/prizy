<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('defaults email_digest_frequency to off and returns it from /v1/me', function (): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    expect($user->email_digest_frequency)->toBe('off');

    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];
    $this->withToken($token)->getJson('/v1/me')
        ->assertStatus(200)
        ->assertJsonPath('data.email_digest_frequency', 'off');

    Workspace::forgetCurrent();
});
