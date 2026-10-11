<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectMessage;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{token:string, user:User, workspace:Workspace, project:Project, issue:Closure(array):Issue} */
function chatWorld(array $userAttrs = ['is_developer' => true]): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $userAttrs));
    $team = Team::factory()->for($ws, 'workspace')->create();
    $project = Project::factory()->for($ws, 'workspace')->create(['created_by' => $user->id, 'name' => 'Unified Inbox']);
    $issue = fn (array $attrs = []): Issue => Issue::factory()->for($ws, 'workspace')
        ->create(array_merge(['team_id' => $team->id, 'created_by' => $user->id, 'project_id' => $project->id], $attrs));

    return ['token' => app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'], 'user' => $user, 'workspace' => $ws, 'project' => $project, 'issue' => $issue];
}

/** A message written straight to the table (the current workspace fills workspace_id). */
function chatRow(Project $project, User $author, string $body, array $attrs = []): ProjectMessage
{
    return ProjectMessage::forceCreate(array_merge(['project_id' => $project->id, 'user_id' => $author->id, 'body' => $body], $attrs));
}

afterEach(fn () => Workspace::forgetCurrent());

it('lists the chat newest first in pages of 50, without deleted messages', function (): void {
    ['token' => $token, 'user' => $user, 'project' => $project] = chatWorld();
    for ($i = 1; $i <= 52; $i++) {
        chatRow($project, $user, "Message {$i}", ['created_at' => now()->addSeconds($i)]);
    }
    chatRow($project, $user, 'Deleted one', ['created_at' => now()->addMinutes(5), 'deleted_at' => now()]);

    $first = $this->withToken($token)->getJson("/v1/projects/{$project->id}/messages")->assertStatus(200);
    expect($first->json('data'))->toHaveCount(50);
    expect($first->json('data.0.body'))->toBe('Message 52');
    expect($first->json('data.49.body'))->toBe('Message 3');
    expect($first->json('links.next'))->toBeString();

    $second = $this->withToken($token)->getJson($first->json('links.next'))->assertStatus(200);
    expect(collect($second->json('data'))->pluck('body')->all())->toBe(['Message 2', 'Message 1']);
});

it('posts a message (201) with its linked issues, and the project counts it', function (): void {
    ['token' => $token, 'project' => $project, 'issue' => $makeIssue] = chatWorld();
    $issue = $makeIssue(['id' => 'abc12300-0000-4000-8000-000000000001', 'title' => 'Fix login', 'status' => 'todo']);

    $this->withToken($token)->postJson("/v1/projects/{$project->id}/messages", ['body' => '  See PRZ-ABC123 please  ', 'issue_ids' => [$issue->id]])
        ->assertStatus(201)
        ->assertJsonPath('data.body', 'See PRZ-ABC123 please')
        ->assertJsonPath('data.edited_at', null)
        ->assertJsonPath('data.issues.0.id', $issue->id)
        ->assertJsonPath('data.issues.0.identifier', 'PRZ-ABC123')
        ->assertJsonPath('data.issues.0.title', 'Fix login');

    $this->withToken($token)->getJson("/v1/projects/{$project->id}")->assertStatus(200)->assertJsonPath('data.messages_count', 1);
    $this->withToken($token)->getJson('/v1/projects')->assertStatus(200)->assertJsonMissingPath('data.0.messages_count');
});

it('rejects blank text, text over 4000 characters, and foreign or deleted issues (422)', function (): void {
    ['issue' => $makeForeign] = chatWorld();
    $foreign = $makeForeign(['title' => 'Elsewhere']);
    Workspace::forgetCurrent();
    ['token' => $token, 'workspace' => $ws, 'project' => $project, 'issue' => $makeIssue] = chatWorld();
    $deleted = $makeIssue(['title' => 'Gone']);
    $deleted->delete();
    $url = "/v1/projects/{$project->id}/messages";

    $this->withToken($token)->withSession(['ensure_valid_tenant_session_tenant_id' => $ws->id])->postJson($url, ['body' => '   '])->assertStatus(422);
    $this->withToken($token)->postJson($url, ['body' => str_repeat('a', 4001)])->assertStatus(422);
    $this->withToken($token)->postJson($url, ['body' => str_repeat('a', 4000)])->assertStatus(201);
    $this->withToken($token)->postJson($url, ['body' => 'x', 'issue_ids' => [$foreign->id]])->assertStatus(422)->assertJsonValidationErrors('issue_ids');
    $this->withToken($token)->postJson($url, ['body' => 'x', 'issue_ids' => [$deleted->id]])->assertStatus(422)->assertJsonValidationErrors('issue_ids');
});

it('is for tracker users: a viewer reads but cannot post, a plain member cannot read, the owner can do both', function (): void {
    // EnsureValidTenantSession pins the tenant in the session, so flush it before each switch of workspace.
    $cases = [
        [['is_developer' => true, 'admin_level' => 'viewer'], 200, 403],
        [['is_developer' => false, 'admin_level' => 'member'], 403, 403],
        [['is_developer' => false, 'admin_level' => 'owner'], 200, 201],
    ];
    foreach ($cases as [$flags, $read, $post]) {
        test()->flushSession();
        ['token' => $token, 'project' => $project] = chatWorld($flags);
        $this->withToken($token)->getJson("/v1/projects/{$project->id}/messages")->assertStatus($read);
        $this->withToken($token)->postJson("/v1/projects/{$project->id}/messages", ['body' => 'Hello'])->assertStatus($post);
        Workspace::forgetCurrent();
    }
});

it('answers 404 for another workspace\'s project and for a deleted project', function (): void {
    ['project' => $foreign] = chatWorld();
    Workspace::forgetCurrent();
    ['token' => $token, 'workspace' => $ws, 'project' => $project] = chatWorld();

    $this->withToken($token)->withSession(['ensure_valid_tenant_session_tenant_id' => $ws->id])
        ->getJson("/v1/projects/{$foreign->id}/messages")->assertStatus(404);

    $project->delete();
    $this->withToken($token)->getJson("/v1/projects/{$project->id}/messages")->assertStatus(404);
});

it('edits your own message: new text, edited_at stamped, links replaced', function (): void {
    ['token' => $token, 'user' => $user, 'project' => $project, 'issue' => $makeIssue] = chatWorld();
    $old = $makeIssue(['title' => 'Old']);
    $new = $makeIssue(['title' => 'New']);
    $message = chatRow($project, $user, 'First draft');
    $message->issues()->sync([$old->id]);

    $this->withToken($token)->patchJson("/v1/projects/{$project->id}/messages/{$message->id}", ['body' => 'Second draft', 'issue_ids' => [$new->id]])
        ->assertStatus(200)
        ->assertJsonPath('data.body', 'Second draft')
        ->assertJsonPath('data.issues.0.id', $new->id)
        ->assertJsonCount(1, 'data.issues');

    expect(ProjectMessage::query()->find($message->id)?->edited_at)->not->toBeNull();
});

it('lets only the author edit or delete a message: 403 for anyone else, the owner included', function (): void {
    ['user' => $author, 'project' => $project, 'workspace' => $ws] = chatWorld();
    $message = chatRow($project, $author, 'Mine');
    $owner = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'admin_level' => 'owner']);
    $ownerToken = app(CreatePersonalAccessToken::class)->handle($owner, 't', null)['token'];
    $url = "/v1/projects/{$project->id}/messages/{$message->id}";

    $this->withToken($ownerToken)->patchJson($url, ['body' => 'Not yours'])->assertStatus(403);
    $this->withToken($ownerToken)->deleteJson($url)->assertStatus(403);

    expect(ProjectMessage::query()->find($message->id)?->body)->toBe('Mine');
});

it('deletes your own message (204): gone from the chat and the count; editing it afterwards answers 404', function (): void {
    ['token' => $token, 'user' => $user, 'project' => $project] = chatWorld();
    $message = chatRow($project, $user, 'Oops');
    chatRow($project, $user, 'Keep');
    $url = "/v1/projects/{$project->id}/messages/{$message->id}";

    $this->withToken($token)->deleteJson($url)->assertStatus(204);

    $list = $this->withToken($token)->getJson("/v1/projects/{$project->id}/messages")->assertStatus(200);
    expect(collect($list->json('data'))->pluck('body')->all())->toBe(['Keep']);
    $this->withToken($token)->getJson("/v1/projects/{$project->id}")->assertJsonPath('data.messages_count', 1);
    $this->withToken($token)->patchJson($url, ['body' => 'Back?'])->assertStatus(404);
    expect(ProjectMessage::withTrashed()->find($message->id)?->deleted_at)->not->toBeNull();
});

it('drops a deleted issue from a message\'s links', function (): void {
    ['token' => $token, 'user' => $user, 'project' => $project, 'issue' => $makeIssue] = chatWorld();
    $gone = $makeIssue(['title' => 'Gone']);
    $kept = $makeIssue(['title' => 'Kept']);
    $message = chatRow($project, $user, 'Two links');
    $message->issues()->sync([$gone->id, $kept->id]);
    $gone->delete();

    $this->withToken($token)->getJson("/v1/projects/{$project->id}/messages")
        ->assertStatus(200)
        ->assertJsonCount(1, 'data.0.issues')
        ->assertJsonPath('data.0.issues.0.id', $kept->id);
});

it('enforces RLS on project_messages', function (): void {
    $row = collect(DB::select("select relrowsecurity, relforcerowsecurity from pg_class where relname = 'project_messages'"))->first();
    expect($row->relrowsecurity)->toBeTrue();
    expect($row->relforcerowsecurity)->toBeTrue();

    ['user' => $user, 'project' => $project] = chatWorld();
    chatRow($project, $user, 'Ours');
    Workspace::forgetCurrent();
    Workspace::factory()->create()->makeCurrent();

    // RLS bites even a raw query under the other tenant's GUC.
    expect(DB::table('project_messages')->count())->toBe(0);
});
