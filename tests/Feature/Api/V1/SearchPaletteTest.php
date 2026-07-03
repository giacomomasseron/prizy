<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('returns grouped, workspace-scoped palette results', function (): void {
    $ws   = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $team = Team::factory()->for($ws, 'workspace')->create(['name' => 'Payments']);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    Issue::factory()->for($ws, 'workspace')->for($team)->create(['title' => 'Payment webhook', 'created_by' => $user->id]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    $res = $this->withToken($token)->getJson('/v1/search?q=Payment');
    Workspace::forgetCurrent();

    $res->assertOk()
        ->assertJsonCount(1, 'data.issues')
        ->assertJsonCount(1, 'data.teams')
        ->assertJsonPath('data.teams.0.name', 'Payments');
});

it('does not leak another workspace\'s issues (tenancy)', function (): void {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    $b->makeCurrent();
    $tb = Team::factory()->for($b, 'workspace')->create();
    $ub = User::factory()->for($b, 'workspace')->create();
    Issue::factory()->for($b, 'workspace')->for($tb)->create(['title' => 'Payment secret', 'created_by' => $ub->id]);
    Workspace::forgetCurrent();

    test()->actingInWorkspace($a);
    $ta  = Team::factory()->for($a, 'workspace')->create();
    $ua  = User::factory()->for($a, 'workspace')->create(['email_verified_at' => now()]);
    Issue::factory()->for($a, 'workspace')->for($ta)->create(['title' => 'Payment mine', 'created_by' => $ua->id]);
    $token = app(CreatePersonalAccessToken::class)->handle($ua, 't', null)['token'];

    $res = $this->withToken($token)->getJson('/v1/search?q=Payment');
    Workspace::forgetCurrent();

    $res->assertOk()->assertJsonCount(1, 'data.issues');
});

it('returns empty groups for a blank query', function (): void {
    $ws   = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    $res = $this->withToken($token)->getJson('/v1/search?q=');
    Workspace::forgetCurrent();

    $res->assertOk()
        ->assertJsonCount(0, 'data.issues')
        ->assertJsonCount(0, 'data.projects')
        ->assertJsonCount(0, 'data.teams');
});
