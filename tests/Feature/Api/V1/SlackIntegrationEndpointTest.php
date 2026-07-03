<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

function slackToken(Workspace $ws, string $level): string
{
    $user = User::factory()->for($ws, 'workspace')->create(['admin_level' => $level, 'email_verified_at' => now()]);
    return app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];
}

it('lets an admin configure and read back a masked config', function (): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $token = slackToken($ws, 'admin');

    $this->withToken($token)->putJson('/v1/integrations/slack', [
        'webhook_url' => 'https://hooks.slack.com/services/T1/B1/tok',
        'events' => ['created', 'status_changed'],
        'is_active' => true,
    ])->assertOk()->assertJsonPath('data.configured', true)->assertJsonPath('data.is_active', true);

    $res = $this->withToken($token)->getJson('/v1/integrations/slack');
    $res->assertOk()
        ->assertJsonPath('data.configured', true)
        ->assertJsonPath('data.events', ['created', 'status_changed']);
    // never returns the raw url
    expect(json_encode($res->json()))->not->toContain('T1/B1/tok');

    Workspace::forgetCurrent();
});

it('validates the url host and event keys (422)', function (): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $token = slackToken($ws, 'admin');

    $this->withToken($token)->putJson('/v1/integrations/slack', ['webhook_url' => 'https://evil.example.com/x', 'events' => ['created'], 'is_active' => true])->assertStatus(422);
    $this->withToken($token)->putJson('/v1/integrations/slack', ['events' => ['nonsense'], 'is_active' => true])->assertStatus(422);

    Workspace::forgetCurrent();
});

it('forbids a non-admin member (403)', function (): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $token = slackToken($ws, 'member');

    $this->withToken($token)->getJson('/v1/integrations/slack')->assertStatus(403);
    $this->withToken($token)->putJson('/v1/integrations/slack', ['events' => ['created'], 'is_active' => true])->assertStatus(403);

    Workspace::forgetCurrent();
});

it('returns 422 on test when no url configured, 202 when configured', function (): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $token = slackToken($ws, 'admin');

    $this->withToken($token)->postJson('/v1/integrations/slack/test')->assertStatus(422);

    $this->withToken($token)->putJson('/v1/integrations/slack', ['webhook_url' => 'https://hooks.slack.com/services/A', 'events' => ['created'], 'is_active' => true]);
    $this->withToken($token)->postJson('/v1/integrations/slack/test')->assertStatus(202);

    Workspace::forgetCurrent();
});
