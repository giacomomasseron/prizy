<?php

declare(strict_types=1);

use App\Events\IssueCreated;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('authenticates GET /v1/issues and /v1/me via the session (web guard)', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);

    $this->actingAs($user)->getJson('/v1/me')->assertStatus(200);
    $this->actingAs($user)->getJson('/v1/issues')->assertStatus(200);

    Workspace::forgetCurrent();
});

it('still authenticates via a Bearer token (Plan 4 path unbroken)', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    $this->withToken($token)->getJson('/v1/issues')->assertStatus(200);

    Workspace::forgetCurrent();
});

it('a Bearer write needs no CSRF token', function (): void {
    // Event::fake() prevents the broadcast job from contacting Reverb during
    // tests — all other issue-write tests in this project do the same because
    // BROADCAST_CONNECTION=null in phpunit.xml is overridden by the .env file.
    Event::fake([IssueCreated::class]);

    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    $this->withToken($token)->postJson('/v1/issues', ['team_id' => $team->id, 'title' => 'Via bearer'])
        ->assertStatus(201);

    Workspace::forgetCurrent();
});
