<?php

declare(strict_types=1);

use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;

uses(RefreshDatabase::class);

// The sign-up page shows whether the address being typed is free. It answers
// what sign-up itself would: the same format and reserved-name rule, and the
// same count of taken slugs.

beforeEach(function (): void {
    config([
        'app.url'         => 'https://prizy.test',
        'app.base_domain' => 'prizy.test',
        'app.signup_host' => 'signup.prizy.test',
    ]);
});

function slugCheck(string $slug, string $ip = '198.51.100.90'): TestResponse
{
    return test()->withServerVariables(['REMOTE_ADDR' => $ip])
        ->getJson('https://signup.prizy.test/workspaces/slug-check?slug='.urlencode($slug));
}

it('says a free slug is available, with no workspace current', function (): void {
    slugCheck('northwind')->assertOk()->assertExactJson(['available' => true, 'reason' => null, 'message' => null]);
});

it('says a slug another workspace holds is taken', function (): void {
    Workspace::factory()->create(['slug' => 'acme']);

    slugCheck('acme')->assertOk()->assertExactJson(['available' => false, 'reason' => 'taken', 'message' => null]);
});

it('counts a workspace awaiting activation, or deleted and not yet erased, as taken, like sign-up does', function (): void {
    Workspace::factory()->create(['slug' => 'pending', 'activated_at' => null]);
    Workspace::factory()->create(['slug' => 'closed'])->delete();

    slugCheck('pending')->assertJsonPath('reason', 'taken');
    slugCheck('closed')->assertJsonPath('reason', 'taken');
});

it('refuses a reserved name, the sign-up host\'s own included, with the rule\'s message', function (): void {
    slugCheck('admin')->assertOk()->assertExactJson(['available' => false, 'reason' => 'reserved', 'message' => 'That address is reserved.']);

    config(['app.signup_host' => 'join.prizy.test']);
    slugCheck('join')->assertJsonPath('reason', 'reserved');
});

it('refuses a malformed slug with the rule\'s message', function (string $slug): void {
    slugCheck($slug)->assertOk()
        ->assertJsonPath('available', false)
        ->assertJsonPath('reason', 'invalid')
        ->assertJsonPath('message', 'Use 3–63 lowercase letters, numbers and hyphens, starting and ending with a letter or number.');
})->with(['ab', 'North', 'north-', 'xn--north', 'north wind']);

it('treats a missing or array slug as malformed, not as a server error', function (): void {
    $this->getJson('https://signup.prizy.test/workspaces/slug-check')->assertOk()->assertJsonPath('reason', 'invalid');
    $this->getJson('https://signup.prizy.test/workspaces/slug-check?slug[]=acme')->assertOk()->assertJsonPath('reason', 'invalid');
});

it('allows sixty checks a minute, on a count of its own', function (): void {
    $ip = '198.51.100.91';

    // Unnamed, this throttle would share its count (and window) with sign-up's.
    $this->withServerVariables(['REMOTE_ADDR' => $ip])->postJson('https://signup.prizy.test/workspaces', [])->assertStatus(422);

    for ($i = 1; $i <= 60; $i++) {
        slugCheck("north{$i}", $ip)->assertOk();
    }
    slugCheck('north61', $ip)->assertStatus(429);

    $this->withServerVariables(['REMOTE_ADDR' => $ip])->postJson('https://signup.prizy.test/workspaces', [])->assertStatus(422);
});
