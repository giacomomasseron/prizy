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

it('returns a paged, filtered issue list', function (): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    $done = Issue::factory()->for($ws, 'workspace')->for($team)->create(['title' => 'Payment done', 'status' => 'done', 'created_by' => $user->id]);
    Issue::factory()->for($ws, 'workspace')->for($team)->create(['title' => 'Payment todo', 'status' => 'todo', 'created_by' => $user->id]);

    $res = $this->withToken($token)->getJson('/v1/search/issues?q=Payment&filter[status]=done');
    Workspace::forgetCurrent();

    $res->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $done->id);
});

it('excludes archived issues by default', function (): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    Issue::factory()->for($ws, 'workspace')->for($team)->create(['title' => 'Payment archived', 'archived_at' => now(), 'created_by' => $user->id]);

    $res = $this->withToken($token)->getJson('/v1/search/issues?q=Payment');
    Workspace::forgetCurrent();

    $res->assertOk()->assertJsonCount(0, 'data');
});

it('rejects a bad status filter with 422', function (): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    $res = $this->withToken($token)->getJson('/v1/search/issues?q=x&filter[status]=nonsense');
    Workspace::forgetCurrent();

    $res->assertStatus(422);
});
