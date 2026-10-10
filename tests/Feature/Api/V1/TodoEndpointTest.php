<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\UserTodo;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{token:string, user:User, workspace:Workspace, issue:Closure(array):Issue} */
function todoWorld(array $userAttrs = ['is_developer' => true]): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $userAttrs));
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = fn (array $attrs = []): Issue => Issue::factory()->for($ws, 'workspace')
        ->create(array_merge(['team_id' => $team->id, 'created_by' => $user->id], $attrs));

    return ['token' => app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'], 'user' => $user, 'workspace' => $ws, 'issue' => $issue];
}

/** A to-do written straight to the table (the current workspace fills workspace_id). */
function todoRow(User $user, string $body, float $position, array $attrs = []): UserTodo
{
    return UserTodo::query()->create(array_merge(['user_id' => $user->id, 'body' => $body, 'position' => $position], $attrs));
}

/** @return list<string> the texts of a to-do list response, in order */
function todoTexts($res): array
{
    return collect($res->json('data'))->pluck('text')->all();
}

afterEach(fn () => Workspace::forgetCurrent());

it('lists only the caller\'s to-dos: the open ones by position, then the done ones newest first', function (): void {
    ['token' => $token, 'user' => $user, 'workspace' => $ws] = todoWorld();
    $other = User::factory()->for($ws, 'workspace')->create(['is_developer' => true]);
    todoRow($user, 'Second', 2);
    todoRow($user, 'First', 1);
    todoRow($user, 'Done earlier', 3, ['completed_at' => now()->subHour()]);
    todoRow($user, 'Done later', 4, ['completed_at' => now()]);
    todoRow($other, 'Not mine', 0);

    $res = $this->withToken($token)->getJson('/v1/me/todos')->assertStatus(200);

    expect(todoTexts($res))->toBe(['First', 'Second', 'Done later', 'Done earlier']);
    $res->assertJsonPath('data.0.done', false)->assertJsonPath('data.2.done', true);
});

it('adds a to-do on top of the open list (201) with no linked issue', function (): void {
    ['token' => $token, 'user' => $user] = todoWorld();
    todoRow($user, 'Already here', 5);

    $this->withToken($token)->postJson('/v1/me/todos', ['text' => '  Book 1:1 with Priya  '])
        ->assertStatus(201)
        ->assertJsonPath('data.text', 'Book 1:1 with Priya')
        ->assertJsonPath('data.done', false)
        ->assertJsonPath('data.completed_at', null)
        ->assertJsonPath('data.issue', null);

    $res = $this->withToken($token)->getJson('/v1/me/todos')->assertStatus(200);
    expect(todoTexts($res))->toBe(['Book 1:1 with Priya', 'Already here']);
});

it('links an issue by id and answers its reference, title and status; an archived issue can be linked', function (): void {
    ['token' => $token, 'issue' => $makeIssue] = todoWorld();
    $issue = $makeIssue(['id' => 'abc12300-0000-4000-8000-000000000001', 'title' => 'Fix login', 'status' => 'todo']);
    $archived = $makeIssue(['title' => 'Old one', 'status' => 'done', 'archived_at' => now()]);

    $this->withToken($token)->postJson('/v1/me/todos', ['text' => 'Reply about PRZ-ABC123', 'issue_id' => $issue->id])
        ->assertStatus(201)
        ->assertJsonPath('data.issue.id', $issue->id)
        ->assertJsonPath('data.issue.identifier', 'PRZ-ABC123')
        ->assertJsonPath('data.issue.title', 'Fix login')
        ->assertJsonPath('data.issue.status', 'todo');
    $this->withToken($token)->postJson('/v1/me/todos', ['text' => 'Look back', 'issue_id' => $archived->id])
        ->assertStatus(201)
        ->assertJsonPath('data.issue.id', $archived->id);
});

it('rejects blank text and text over 500 characters (422), and accepts 500', function (): void {
    ['token' => $token] = todoWorld();

    $this->withToken($token)->postJson('/v1/me/todos', ['text' => '   '])->assertStatus(422);
    $this->withToken($token)->postJson('/v1/me/todos', ['text' => str_repeat('a', 501)])->assertStatus(422);
    $this->withToken($token)->postJson('/v1/me/todos', ['text' => str_repeat('a', 500)])->assertStatus(201);
});

it('rejects an issue from another workspace or a deleted issue (422)', function (): void {
    ['issue' => $makeForeign] = todoWorld();
    $foreign = $makeForeign(['title' => 'Elsewhere']);
    Workspace::forgetCurrent();
    ['token' => $token, 'workspace' => $ws, 'issue' => $makeIssue] = todoWorld();
    $deleted = $makeIssue(['title' => 'Gone']);
    $deleted->delete();

    $this->withToken($token)->withSession(['ensure_valid_tenant_session_tenant_id' => $ws->id])
        ->postJson('/v1/me/todos', ['text' => 'x', 'issue_id' => $foreign->id])
        ->assertStatus(422)->assertJsonValidationErrors('issue_id');
    $this->withToken($token)->postJson('/v1/me/todos', ['text' => 'x', 'issue_id' => $deleted->id])
        ->assertStatus(422)->assertJsonValidationErrors('issue_id');
});

it('is for tracker users: an agent-only user or a plain member gets 403, an owner and a developer viewer get 200', function (): void {
    // EnsureValidTenantSession pins the tenant in the session, so flush it before each switch of workspace.
    foreach ([['is_developer' => false, 'is_agent' => true, 'admin_level' => 'member'], ['is_developer' => false, 'admin_level' => 'member']] as $flags) {
        test()->flushSession();
        ['token' => $token] = todoWorld($flags);
        $this->withToken($token)->getJson('/v1/me/todos')->assertStatus(403);
        $this->withToken($token)->postJson('/v1/me/todos', ['text' => 'x'])->assertStatus(403);
        Workspace::forgetCurrent();
    }
    foreach ([['is_developer' => false, 'admin_level' => 'owner'], ['is_developer' => true, 'admin_level' => 'viewer']] as $flags) {
        test()->flushSession();
        ['token' => $token] = todoWorld($flags);
        $this->withToken($token)->getJson('/v1/me/todos')->assertStatus(200);
        $this->withToken($token)->postJson('/v1/me/todos', ['text' => 'mine'])->assertStatus(201);
        Workspace::forgetCurrent();
    }
});

it('answers 404, not 403, for another user\'s to-do, and leaves it untouched', function (): void {
    ['token' => $token, 'workspace' => $ws] = todoWorld();
    $other = User::factory()->for($ws, 'workspace')->create(['is_developer' => true]);
    $theirs = todoRow($other, 'Private', 1);

    $this->withToken($token)->patchJson("/v1/me/todos/{$theirs->id}", ['done' => true])->assertStatus(404);
    $this->withToken($token)->deleteJson("/v1/me/todos/{$theirs->id}")->assertStatus(404);

    expect(UserTodo::query()->find($theirs->id)?->completed_at)->toBeNull();
});

it('answers 404 for a to-do in another workspace', function (): void {
    ['user' => $foreignUser] = todoWorld();
    $foreign = todoRow($foreignUser, 'Elsewhere', 1);
    Workspace::forgetCurrent();
    ['token' => $token, 'workspace' => $ws] = todoWorld();

    $this->withToken($token)->withSession(['ensure_valid_tenant_session_tenant_id' => $ws->id])
        ->patchJson("/v1/me/todos/{$foreign->id}", ['done' => true])->assertStatus(404);
});

it('ticks and unticks a to-do: completed_at is set, kept on a second tick, cleared on untick; the position stays', function (): void {
    ['token' => $token, 'user' => $user] = todoWorld();
    $todo = todoRow($user, 'Tick me', 7);

    $first = $this->withToken($token)->patchJson("/v1/me/todos/{$todo->id}", ['done' => true])
        ->assertStatus(200)->assertJsonPath('data.done', true)->json('data.completed_at');
    $this->travel(5)->minutes();
    $second = $this->withToken($token)->patchJson("/v1/me/todos/{$todo->id}", ['done' => true])->json('data.completed_at');
    expect($second)->toBe($first);

    $this->withToken($token)->patchJson("/v1/me/todos/{$todo->id}", ['done' => false])
        ->assertStatus(200)
        ->assertJsonPath('data.done', false)
        ->assertJsonPath('data.completed_at', null)
        ->assertJsonPath('data.position', 7);
});

it('moves a to-do by position and renumbers the open list when two positions crowd together', function (): void {
    ['token' => $token, 'user' => $user] = todoWorld();
    $a = todoRow($user, 'A', 1);
    todoRow($user, 'B', 2);
    $c = todoRow($user, 'C', 3);

    $this->withToken($token)->patchJson("/v1/me/todos/{$c->id}", ['position' => 0.5])->assertStatus(200);
    expect(todoTexts($this->withToken($token)->getJson('/v1/me/todos')))->toBe(['C', 'A', 'B']);

    // A lands a hair after C: closer than the minimum gap, so the open list is renumbered 1, 2, 3 in its order.
    $this->withToken($token)->patchJson("/v1/me/todos/{$a->id}", ['position' => 0.5 + 1e-9])
        ->assertStatus(200)->assertJsonPath('data.position', 2);
    $res = $this->withToken($token)->getJson('/v1/me/todos');
    expect(todoTexts($res))->toBe(['C', 'A', 'B']);
    expect(collect($res->json('data'))->pluck('position')->all())->toBe([1, 2, 3]);
});

it('rejects a PATCH with nothing to change (422)', function (): void {
    ['token' => $token, 'user' => $user] = todoWorld();
    $todo = todoRow($user, 'Same', 1);

    $this->withToken($token)->patchJson("/v1/me/todos/{$todo->id}", [])->assertStatus(422);
});

it('deletes one to-do, and Clear deletes only the caller\'s done to-dos', function (): void {
    ['token' => $token, 'user' => $user, 'workspace' => $ws] = todoWorld();
    $other = User::factory()->for($ws, 'workspace')->create(['is_developer' => true]);
    $gone = todoRow($user, 'Delete me', 1);
    todoRow($user, 'Keep open', 2);
    todoRow($user, 'Done', 3, ['completed_at' => now()]);
    todoRow($other, 'Their done', 1, ['completed_at' => now()]);

    $this->withToken($token)->deleteJson("/v1/me/todos/{$gone->id}")->assertStatus(204);
    $this->withToken($token)->deleteJson('/v1/me/todos/done')->assertStatus(204);

    expect(todoTexts($this->withToken($token)->getJson('/v1/me/todos')))->toBe(['Keep open']);
    expect(UserTodo::query()->where('user_id', $other->id)->count())->toBe(1);
});

it('drops the link when the issue is deleted, and keeps it when the issue is archived', function (): void {
    ['token' => $token, 'user' => $user, 'issue' => $makeIssue] = todoWorld();
    $deleted = $makeIssue(['title' => 'Deleted']);
    $archived = $makeIssue(['title' => 'Archived']);
    todoRow($user, 'About the deleted one', 1, ['issue_id' => $deleted->id]);
    todoRow($user, 'About the archived one', 2, ['issue_id' => $archived->id]);
    $deleted->delete();
    $archived->update(['archived_at' => now()]);

    $this->withToken($token)->getJson('/v1/me/todos')
        ->assertStatus(200)
        ->assertJsonPath('data.0.text', 'About the deleted one')
        ->assertJsonPath('data.0.issue', null)
        ->assertJsonPath('data.1.issue.id', $archived->id);
});

it('deletes a user\'s to-dos with the user', function (): void {
    ['user' => $user] = todoWorld();
    todoRow($user, 'Mine', 1);

    $user->forceDelete();

    expect(DB::table('user_todos')->count())->toBe(0);
});

it('enforces RLS on user_todos', function (): void {
    $row = collect(DB::select("select relrowsecurity, relforcerowsecurity from pg_class where relname = 'user_todos'"))->first();
    expect($row->relrowsecurity)->toBeTrue();
    expect($row->relforcerowsecurity)->toBeTrue();

    ['user' => $user] = todoWorld();
    todoRow($user, 'Mine', 1);
    Workspace::forgetCurrent();
    Workspace::factory()->create()->makeCurrent();

    // RLS bites even a raw query under the other tenant's GUC.
    expect(DB::table('user_todos')->count())->toBe(0);
});
