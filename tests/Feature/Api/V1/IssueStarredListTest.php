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

/**
 * Two developers (A, B) and three issues: todo, done, and an archived todo.
 *
 * @return array{a:string, b:string, todo:Issue, done:Issue, archived:Issue}
 */
function starredListWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $userA = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);
    $userB = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);
    $make = fn (array $attrs): Issue => Issue::factory()->for($ws, 'workspace')->create(array_merge(['team_id' => $team->id, 'created_by' => $userA->id], $attrs));

    return [
        'a' => app(CreatePersonalAccessToken::class)->handle($userA, 't', null)['token'],
        'b' => app(CreatePersonalAccessToken::class)->handle($userB, 't', null)['token'],
        'todo' => $make(['status' => 'todo', 'title' => 'Todo one']),
        'done' => $make(['status' => 'done', 'title' => 'Done one']),
        'archived' => $make(['status' => 'todo', 'title' => 'Archived one', 'archived_at' => now()]),
    ];
}

/** @return list<string> the ids in a list response, in order */
function starredIds($res): array
{
    return collect($res->json('data'))->pluck('id')->all();
}

afterEach(fn () => Workspace::forgetCurrent());

it('marks each issue with the caller\'s own star only, on the list and the detail', function (): void {
    ['a' => $a, 'b' => $b, 'todo' => $todo, 'done' => $done] = starredListWorld();
    $this->withToken($a)->putJson("/v1/issues/{$todo->id}/star")->assertStatus(200);

    $listA = collect($this->withToken($a)->getJson('/v1/issues')->assertStatus(200)->json('data'))->keyBy('id');
    expect($listA[$todo->id]['starred'])->toBeTrue();
    expect($listA[$todo->id]['starred_at'])->toBeString();
    expect($listA[$done->id]['starred'])->toBeFalse();
    expect($listA[$done->id]['starred_at'])->toBeNull();

    $listB = collect($this->withToken($b)->getJson('/v1/issues')->assertStatus(200)->json('data'))->keyBy('id');
    expect($listB[$todo->id]['starred'])->toBeFalse();

    $this->withToken($a)->getJson("/v1/issues/{$todo->id}")->assertStatus(200)->assertJsonPath('data.starred', true);
    $this->withToken($b)->getJson("/v1/issues/{$todo->id}")->assertStatus(200)->assertJsonPath('data.starred', false);
});

it('filter[starred]=true returns only the caller\'s starred issues', function (): void {
    ['a' => $a, 'b' => $b, 'todo' => $todo, 'done' => $done] = starredListWorld();
    $this->withToken($a)->putJson("/v1/issues/{$todo->id}/star")->assertStatus(200);
    $this->withToken($b)->putJson("/v1/issues/{$done->id}/star")->assertStatus(200);

    expect(starredIds($this->withToken($a)->getJson('/v1/issues?filter[starred]=true')->assertStatus(200)))->toBe([$todo->id]);
    expect(starredIds($this->withToken($b)->getJson('/v1/issues?filter[starred]=true')->assertStatus(200)))->toBe([$done->id]);
});

it('combines filter[starred] with other filters and drops archived issues', function (): void {
    ['a' => $a, 'todo' => $todo, 'done' => $done, 'archived' => $archived] = starredListWorld();
    foreach ([$todo, $done, $archived] as $issue) {
        $this->withToken($a)->putJson("/v1/issues/{$issue->id}/star")->assertStatus(200);
    }

    $all = starredIds($this->withToken($a)->getJson('/v1/issues?filter[starred]=true')->assertStatus(200));
    expect($all)->toEqualCanonicalizing([$todo->id, $done->id]);

    $todos = starredIds($this->withToken($a)->getJson('/v1/issues?filter[starred]=true&filter[status]=todo')->assertStatus(200));
    expect($todos)->toBe([$todo->id]);
});

it('rejects a starred filter value other than true (422)', function (): void {
    ['a' => $a] = starredListWorld();

    $this->withToken($a)->getJson('/v1/issues?filter[starred]=yes')->assertStatus(422);
});

it('carries the caller\'s star on the issue search endpoint too', function (): void {
    ['a' => $a, 'todo' => $todo] = starredListWorld();
    $this->withToken($a)->putJson("/v1/issues/{$todo->id}/star")->assertStatus(200);

    $found = collect($this->withToken($a)->getJson('/v1/search/issues')->assertStatus(200)->json('data'))->keyBy('id');
    expect($found[$todo->id]['starred'])->toBeTrue();
});
