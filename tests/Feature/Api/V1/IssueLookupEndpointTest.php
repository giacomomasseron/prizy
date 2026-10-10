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

/** @return array{token:string, make:Closure(array):Issue, workspace:Workspace} */
function lookupWorld(array $userAttrs = ['is_developer' => true]): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $userAttrs));
    $team = Team::factory()->for($ws, 'workspace')->create();
    $make = fn (array $attrs = []): Issue => Issue::factory()->for($ws, 'workspace')
        ->create(array_merge(['team_id' => $team->id, 'created_by' => $user->id], $attrs));

    return ['token' => app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'], 'make' => $make, 'workspace' => $ws];
}

/** @return list<string> the titles in a lookup response, in order */
function lookupTitles($res): array
{
    return collect($res->json('data'))->pluck('title')->all();
}

afterEach(fn () => Workspace::forgetCurrent());

it('finds an issue by its PRZ- reference, its bare characters or a prefix, in any case', function (): void {
    ['token' => $token, 'make' => $make] = lookupWorld();
    $issue = $make(['id' => 'abc12300-0000-4000-8000-000000000001', 'title' => 'Alpha', 'status' => 'todo']);
    $make(['title' => 'Beta']);

    foreach (['PRZ-ABC123', 'prz-abc1', 'ABC123', 'abc'] as $q) {
        $this->withToken($token)->getJson('/v1/issues/lookup?q='.urlencode($q))
            ->assertStatus(200)
            ->assertJsonPath('data.0.id', $issue->id)
            ->assertJsonPath('data.0.identifier', 'PRZ-ABC123')
            ->assertJsonPath('data.0.title', 'Alpha')
            ->assertJsonPath('data.0.status', $issue->status);
    }
});

it('finds issues by title, case-insensitively, taking % and _ literally', function (): void {
    ['token' => $token, 'make' => $make] = lookupWorld();
    $make(['title' => 'Fix the login bug']);
    $make(['title' => 'Release 100% done']);
    $make(['title' => 'Rename snake_case keys']);
    $make(['title' => 'Something else']);

    expect(lookupTitles($this->withToken($token)->getJson('/v1/issues/lookup?q=LOGIN')->assertStatus(200)))->toBe(['Fix the login bug']);
    expect(lookupTitles($this->withToken($token)->getJson('/v1/issues/lookup?q='.urlencode('%'))->assertStatus(200)))->toBe(['Release 100% done']);
    expect(lookupTitles($this->withToken($token)->getJson('/v1/issues/lookup?q=_')->assertStatus(200)))->toBe(['Rename snake_case keys']);
});

it('lists reference matches before title matches, without duplicates, at most 8', function (): void {
    ['token' => $token, 'make' => $make] = lookupWorld();
    $byRef = $make(['id' => 'add00000-0000-4000-8000-000000000001', 'title' => 'Add the reference one', 'updated_at' => now()->addMinute()]);
    for ($i = 1; $i <= 9; $i++) {
        $make(['title' => "Add widget {$i}"]);
    }

    $res = $this->withToken($token)->getJson('/v1/issues/lookup?q=add')->assertStatus(200);

    expect($res->json('data'))->toHaveCount(8);
    expect($res->json('data.0.id'))->toBe($byRef->id);
    expect(collect($res->json('data'))->pluck('id')->duplicates())->toBeEmpty();
});

it('leaves out archived issues and other workspaces\' issues', function (): void {
    ['make' => $makeForeign] = lookupWorld();
    $makeForeign(['title' => 'Foreign target']);
    Workspace::forgetCurrent();
    ['token' => $token, 'make' => $make, 'workspace' => $ws] = lookupWorld();
    $make(['title' => 'Archived target', 'archived_at' => now()]);
    $make(['title' => 'Live target']);

    $res = $this->withToken($token)
        ->withSession(['ensure_valid_tenant_session_tenant_id' => $ws->id])
        ->getJson('/v1/issues/lookup?q=target')
        ->assertStatus(200);

    expect(lookupTitles($res))->toBe(['Live target']);
});

it('is for tracker users: a non-developer gets 403', function (): void {
    ['token' => $token] = lookupWorld(['is_developer' => false]);

    $this->withToken($token)->getJson('/v1/issues/lookup?q=abc')->assertStatus(403);
});

it('requires a query (422)', function (): void {
    ['token' => $token] = lookupWorld();

    $this->withToken($token)->getJson('/v1/issues/lookup')->assertStatus(422);
    $this->withToken($token)->getJson('/v1/issues/lookup?q=%20%20')->assertStatus(422);
});

it('lists an older reference match before newer title matches', function (): void {
    ['token' => $token, 'make' => $make] = lookupWorld();
    $byRef = $make(['id' => 'add00000-0000-4000-8000-000000000002', 'title' => 'Zeta', 'updated_at' => now()->subDay()]);
    for ($i = 1; $i <= 8; $i++) {
        $make(['id' => sprintf('00000000-0000-4000-8000-%012d', $i), 'title' => "Add widget {$i}"]);
    }

    $res = $this->withToken($token)->getJson('/v1/issues/lookup?q=add')->assertStatus(200);

    expect($res->json('data'))->toHaveCount(8);
    expect($res->json('data.0.id'))->toBe($byRef->id);
});
