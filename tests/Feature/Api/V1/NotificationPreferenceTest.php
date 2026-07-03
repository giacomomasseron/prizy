<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('updates the caller email digest frequency and validates the enum', function (): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    $this->withToken($token)->patchJson('/v1/notifications/preferences', ['email_digest_frequency' => 'daily'])->assertStatus(204);
    expect($user->refresh()->email_digest_frequency)->toBe('daily');
    $this->withToken($token)->getJson('/v1/me')->assertJsonPath('data.email_digest_frequency', 'daily');

    $this->withToken($token)->patchJson('/v1/notifications/preferences', ['email_digest_frequency' => 'hourly'])->assertStatus(422);

    Workspace::forgetCurrent();
});
