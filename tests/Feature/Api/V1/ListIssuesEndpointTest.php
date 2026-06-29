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

/** @return array{0:string,1:callable} bearer token + issue factory */
function apiWorld(array $userAttrs = []): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(
        ['email_verified_at' => now(), 'is_developer' => true],
        $userAttrs,
    ));
    $team = Team::factory()->for($ws, 'workspace')->create();
    $token = app(CreatePersonalAccessToken::class)->handle($user, 'test', null)['token'];
    $make = fn (array $a = []): Issue => Issue::factory()->for($ws, 'workspace')
        ->create(array_merge(['team_id' => $team->id, 'created_by' => $user->id], $a));

    return [$token, $make];
}

it('lists issues in a data envelope', function (): void {
    [$token, $make] = apiWorld();
    $make(['title' => 'A', 'status' => 'todo']);
    $make(['title' => 'B', 'status' => 'done']);

    $res = $this->withToken($token)->getJson('/v1/issues');

    $res->assertStatus(200);
    expect($res->json('data'))->toHaveCount(2);
    expect($res->json('data.0'))->toHaveKey('title');

    Workspace::forgetCurrent();
});

it('filters by status and rejects an unknown filter key with 422', function (): void {
    [$token, $make] = apiWorld();
    $make(['status' => 'todo']);
    $make(['status' => 'done']);

    $this->withToken($token)->getJson('/v1/issues?filter[status]=todo')
        ->assertStatus(200)
        ->assertJsonCount(1, 'data');

    $this->withToken($token)->getJson('/v1/issues?filter[bogus]=x')
        ->assertStatus(422);

    Workspace::forgetCurrent();
});

it('cursor-paginates with limit and a next link', function (): void {
    [$token, $make] = apiWorld();
    foreach (range(1, 3) as $i) {
        $make(['status' => 'todo']);
    }

    $res = $this->withToken($token)->getJson('/v1/issues?limit=2');
    $res->assertStatus(200)->assertJsonCount(2, 'data');
    expect($res->json('links.next'))->not->toBeNull();

    Workspace::forgetCurrent();
});

it('applies sparse fieldsets', function (): void {
    [$token, $make] = apiWorld();
    $make(['title' => 'A']);

    $res = $this->withToken($token)->getJson('/v1/issues?fields[issues]=title,status');

    expect(array_keys($res->json('data.0')))->toEqualCanonicalizing(['id', 'title', 'status']);

    Workspace::forgetCurrent();
});

it('rejects an unknown sort field with 422', function (): void {
    [$token, $make] = apiWorld();
    $make();

    $this->withToken($token)->getJson('/v1/issues?sort=hacker')->assertStatus(422);

    Workspace::forgetCurrent();
});
