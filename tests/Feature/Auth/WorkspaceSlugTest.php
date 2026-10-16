<?php

declare(strict_types=1);

use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

// The slug becomes a hostname (acme.prizy.dev), so sign-up must refuse any
// slug no hostname can carry — the tenant finder would never resolve it and
// the workspace would exist with no way in — and the names the platform
// keeps for itself.

/**
 * Post a sign-up with $slug. Each call comes from its own address: sign-up is
 * throttled per IP, and these datasets post far more often than the limit.
 */
function slugRulesSignUp(string $slug): \Illuminate\Testing\TestResponse
{
    static $n = 0;
    $n++;

    return test()->withServerVariables(['REMOTE_ADDR' => '192.0.2.'.$n])->postJson('/workspaces', [
        'workspace_name' => 'Acme Corp',
        'slug'           => $slug,
        'name'           => 'Alice',
        'email'          => "alice{$n}@example.com",
        'password'       => 'password123',
    ]);
}

beforeEach(function (): void {
    Notification::fake();
});

it('refuses a slug no hostname can carry', function (string $slug): void {
    slugRulesSignUp($slug)
        ->assertStatus(422)
        ->assertJsonValidationErrors(['slug' => 'lowercase letters, numbers and hyphens']);

    expect(Workspace::query()->count())->toBe(0);
})->with([
    'uppercase'          => 'Acme',
    'a space'            => 'my org',
    'a dot'              => 'my.org',
    'an underscore'      => 'my_org',
    'a leading hyphen'   => '-acme',
    'a trailing hyphen'  => 'acme-',
    'a double hyphen'    => 'my--org',
    'a punycode prefix'  => 'xn--acme',
    'non-ascii'          => 'café',
    'two characters'     => 'ab',
    'sixty-four chars'   => str_repeat('a', 64),
]);

it('refuses a reserved slug', function (string $slug): void {
    slugRulesSignUp($slug)
        ->assertStatus(422)
        ->assertJsonValidationErrors(['slug' => 'That address is reserved.']);

    expect(Workspace::query()->count())->toBe(0);
})->with(['www', 'app', 'api', 'admin', 'mail', 'help', 'support', 'status', 'docs', 'signup', 'billing']);

it('accepts a slug at the edges of the rules', function (string $slug): void {
    slugRulesSignUp($slug)->assertStatus(201);

    expect(Workspace::query()->where('slug', $slug)->exists())->toBeTrue();
})->with([
    'three characters'   => 'a1b',
    'sixty-three chars'  => str_repeat('a', 63),
    'inner hyphens'      => 'my-big-org',
    'all digits'         => '123',
    'a reserved word inside' => 'www-acme',
]);

it('still reports a taken slug as taken once the format passes', function (): void {
    Workspace::factory()->create(['slug' => 'taken']);

    slugRulesSignUp('taken')
        ->assertStatus(422)
        ->assertJsonValidationErrors(['slug' => 'taken']);
});
