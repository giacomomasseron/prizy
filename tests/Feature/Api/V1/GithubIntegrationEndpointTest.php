<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

function githubToken(Workspace $ws, string $level): string
{
    $user = User::factory()->for($ws, 'workspace')->create(['admin_level' => $level, 'email_verified_at' => now()]);
    return app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];
}

it('lets an admin configure and read back a masked config with a webhook url', function (): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $token = githubToken($ws, 'admin');

    $this->withToken($token)->putJson('/v1/integrations/github', [
        'webhook_secret' => 'top-secret-hmac',
        'move_to_done_on_merge' => true,
        'is_active' => true,
    ])->assertOk()->assertJsonPath('data.configured', true)->assertJsonPath('data.secret_set', true);

    $res = $this->withToken($token)->getJson('/v1/integrations/github');
    $res->assertOk()
        ->assertJsonPath('data.configured', true)
        ->assertJsonPath('data.secret_set', true)
        ->assertJsonPath('data.move_to_done_on_merge', true);
    // webhook_url is present and points at the webhook path; the raw secret is never returned.
    expect($res->json('data.webhook_url'))->toContain('/integrations/github/webhook/');
    expect(json_encode($res->json()))->not->toContain('top-secret-hmac');

    Workspace::forgetCurrent();
});

it('keeps the existing secret when omitted, and toggles', function (): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $token = githubToken($ws, 'admin');

    $this->withToken($token)->putJson('/v1/integrations/github', ['webhook_secret' => 'keep-me', 'move_to_done_on_merge' => true, 'is_active' => true]);
    $this->withToken($token)->putJson('/v1/integrations/github', ['move_to_done_on_merge' => false, 'is_active' => true])
        ->assertOk()->assertJsonPath('data.secret_set', true)->assertJsonPath('data.move_to_done_on_merge', false);

    Workspace::forgetCurrent();
});

it('forbids a non-admin (403)', function (): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $token = githubToken($ws, 'member');

    $this->withToken($token)->getJson('/v1/integrations/github')->assertStatus(403);
    $this->withToken($token)->putJson('/v1/integrations/github', ['move_to_done_on_merge' => true, 'is_active' => true])->assertStatus(403);

    Workspace::forgetCurrent();
});
