<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use App\Repositories\NotificationPreferenceRepository;
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

it('returns the caller digest frequency and full preference matrix with defaults', function (): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'email_digest_frequency' => 'daily']);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    $response = $this->withToken($token)->getJson('/v1/notifications/preferences')->assertStatus(200);

    $response->assertJsonPath('data.email_digest_frequency', 'daily');
    $response->assertJsonCount(5, 'data.preferences');

    $preferences = collect($response->json('data.preferences'))->keyBy('event_type');
    expect($preferences->keys()->all())->toEqual(NotificationPreferenceRepository::EVENT_TYPES);

    foreach ($preferences as $eventType => $row) {
        expect($row)->toHaveKeys(['event_type', 'in_app', 'email']);
        expect($row['in_app'])->toBe(NotificationPreferenceRepository::DEFAULTS[$eventType]['in_app']);
        expect($row['email'])->toBe(NotificationPreferenceRepository::DEFAULTS[$eventType]['email']);
    }

    Workspace::forgetCurrent();
});

it('persists per-event preference overrides via PATCH and still accepts digest-frequency-only payloads', function (): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    $this->withToken($token)->patchJson('/v1/notifications/preferences', [
        'preferences' => [
            ['event_type' => 'comment', 'channel' => 'email', 'enabled' => true],
        ],
    ])->assertStatus(204);

    $after = $this->withToken($token)->getJson('/v1/notifications/preferences')->assertStatus(200);
    $preferences = collect($after->json('data.preferences'))->keyBy('event_type');
    expect($preferences['comment']['email'])->toBeTrue();

    // The digest-only PATCH from the earlier test must keep working unchanged.
    $this->withToken($token)->patchJson('/v1/notifications/preferences', ['email_digest_frequency' => 'weekly'])->assertStatus(204);
    expect($user->refresh()->email_digest_frequency)->toBe('weekly');

    Workspace::forgetCurrent();
});

it('rejects an invalid event_type or channel in the preferences array with a 422', function (): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    $this->withToken($token)->patchJson('/v1/notifications/preferences', [
        'preferences' => [
            ['event_type' => 'not-a-real-event', 'channel' => 'email', 'enabled' => true],
        ],
    ])->assertStatus(422);

    $this->withToken($token)->patchJson('/v1/notifications/preferences', [
        'preferences' => [
            ['event_type' => 'comment', 'channel' => 'sms', 'enabled' => true],
        ],
    ])->assertStatus(422);

    Workspace::forgetCurrent();
});
