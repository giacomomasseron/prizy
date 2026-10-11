<?php

declare(strict_types=1);

use App\Events\ProjectMessageDeleted;
use App\Events\ProjectMessageEdited;
use App\Events\ProjectMessagePosted;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectMessage;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

// /broadcasting/auth enforces channel rules only under a Pusher-protocol broadcaster (see ChannelAuthorizationTest),
// so the channel authorizers are re-registered against `reverb`. Writes that fire the chat events fake them.
beforeEach(function (): void {
    config(['broadcasting.default' => 'reverb']);
    require base_path('routes/channels.php');
});

afterEach(fn () => Workspace::forgetCurrent());

/** @return array{workspace:Workspace, user:User, team:Team, project:Project} */
function chatChannelWorld(array $userAttrs = ['is_developer' => true]): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now(), 'name' => 'Maya Chen'], $userAttrs));
    $team = Team::factory()->for($ws, 'workspace')->create();
    $project = Project::factory()->for($ws, 'workspace')->create(['created_by' => $user->id, 'name' => 'Unified Inbox']);

    return ['workspace' => $ws, 'user' => $user, 'team' => $team, 'project' => $project];
}

it('sends a posted or edited message whole on its project channel', function (): void {
    ['workspace' => $ws, 'user' => $user, 'team' => $team, 'project' => $project] = chatChannelWorld();
    $issue = Issue::factory()->for($ws, 'workspace')->create([
        'id' => 'abc12300-0000-4000-8000-000000000001', 'team_id' => $team->id, 'created_by' => $user->id, 'title' => 'Fix login', 'status' => 'todo',
    ]);
    $message = ProjectMessage::forceCreate(['project_id' => $project->id, 'user_id' => $user->id, 'body' => 'See PRZ-ABC123']);
    $message->issues()->sync([$issue->id]);
    $message->load('issues');

    foreach ([new ProjectMessagePosted($message), new ProjectMessageEdited($message)] as $event) {
        expect($event->broadcastOn())->toHaveCount(1);
        expect($event->broadcastOn()[0]->name)->toBe('private-project.' . $project->id);
        expect($event->broadcastWith())->toMatchArray([
            'id' => $message->id, 'project_id' => $project->id, 'user_id' => $user->id, 'body' => 'See PRZ-ABC123', 'edited_at' => null,
        ]);
        expect($event->broadcastWith()['issues'])->toBe([['id' => $issue->id, 'identifier' => 'PRZ-ABC123', 'title' => 'Fix login', 'status' => 'todo']]);
    }
    expect((new ProjectMessagePosted($message))->broadcastAs())->toBe('ProjectMessagePosted');
    expect((new ProjectMessageEdited($message))->broadcastAs())->toBe('ProjectMessageEdited');
});

it('sends only the id and project when the whole message would not fit the socket', function (): void {
    ['user' => $user, 'project' => $project] = chatChannelWorld();
    $long = ProjectMessage::forceCreate(['project_id' => $project->id, 'user_id' => $user->id, 'body' => str_repeat('a', 4000)]);
    // Each "è" travels as è, then escaped again inside the request body: far past Reverb's 10,000 bytes.
    $accented = ProjectMessage::forceCreate(['project_id' => $project->id, 'user_id' => $user->id, 'body' => str_repeat('è', 4000)]);

    expect((new ProjectMessagePosted($long))->broadcastWith()['body'])->toBe(str_repeat('a', 4000));
    expect((new ProjectMessagePosted($accented))->broadcastWith())->toBe(['id' => $accented->id, 'project_id' => $project->id]);
    expect((new ProjectMessageEdited($accented))->broadcastWith())->toBe(['id' => $accented->id, 'project_id' => $project->id]);
});

it('sends a deleted message as its id', function (): void {
    $event = new ProjectMessageDeleted('project-1', 'message-1');

    expect($event->broadcastOn())->toHaveCount(1);
    expect($event->broadcastOn()[0]->name)->toBe('private-project.project-1');
    expect($event->broadcastAs())->toBe('ProjectMessageDeleted');
    expect($event->broadcastWith())->toBe(['id' => 'message-1']);
});

it('fires each event once its write is saved: post, edit, delete', function (): void {
    ['user' => $user, 'project' => $project] = chatChannelWorld();
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];
    Event::fake([ProjectMessagePosted::class, ProjectMessageEdited::class, ProjectMessageDeleted::class]);
    $url = "/v1/projects/{$project->id}/messages";

    $id = $this->withToken($token)->postJson($url, ['body' => 'Hello'])->assertStatus(201)->json('data.id');
    Event::assertDispatchedTimes(ProjectMessagePosted::class, 1);
    Event::assertDispatched(ProjectMessagePosted::class, fn (ProjectMessagePosted $e): bool => $e->projectId === $project->id
        && $e->message['id'] === $id && $e->message['body'] === 'Hello');

    $this->withToken($token)->patchJson("{$url}/{$id}", ['body' => 'Hello all'])->assertStatus(200);
    Event::assertDispatched(ProjectMessageEdited::class, fn (ProjectMessageEdited $e): bool => $e->projectId === $project->id
        && $e->message['id'] === $id && $e->message['body'] === 'Hello all' && $e->message['edited_at'] !== null);

    $this->withToken($token)->deleteJson("{$url}/{$id}")->assertStatus(204);
    Event::assertDispatched(ProjectMessageDeleted::class, fn (ProjectMessageDeleted $e): bool => $e->projectId === $project->id && $e->id === $id);
});

it('fires nothing for a write that is refused', function (): void {
    ['workspace' => $ws, 'user' => $author, 'project' => $project] = chatChannelWorld();
    $message = ProjectMessage::forceCreate(['project_id' => $project->id, 'user_id' => $author->id, 'body' => 'Mine']);
    $other = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);
    $otherToken = app(CreatePersonalAccessToken::class)->handle($other, 't', null)['token'];
    Event::fake([ProjectMessagePosted::class, ProjectMessageEdited::class, ProjectMessageDeleted::class]);
    $url = "/v1/projects/{$project->id}/messages";

    $this->withToken($otherToken)->postJson($url, ['body' => '   '])->assertStatus(422);
    $this->withToken($otherToken)->patchJson("{$url}/{$message->id}", ['body' => 'Not yours'])->assertStatus(403);
    $this->withToken($otherToken)->deleteJson("{$url}/{$message->id}")->assertStatus(403);

    Event::assertNothingDispatched();
});

it('lets the workspace\'s tracker users into the project channel, private and presence, as {id, name}', function (): void {
    ['workspace' => $ws, 'user' => $developer, 'project' => $project] = chatChannelWorld();
    $viewer = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true, 'admin_level' => 'viewer', 'name' => 'Priya Patel']);
    $owner = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => false, 'admin_level' => 'owner', 'name' => 'Alex Rivera']);

    foreach ([$developer, $viewer, $owner] as $user) {
        $this->actingAs($user)->postJson('/broadcasting/auth', ['socket_id' => '1234.5678', 'channel_name' => 'private-project.' . $project->id])
            ->assertOk();
        $presence = $this->actingAs($user)->postJson('/broadcasting/auth', ['socket_id' => '1234.5678', 'channel_name' => 'presence-project.' . $project->id])
            ->assertOk();
        expect(json_decode($presence->json('channel_data'), true))
            ->toBe(['user_id' => $user->id, 'user_info' => ['id' => $user->id, 'name' => $user->name]]);
    }
});

it('keeps out a plain member, another workspace\'s project, a deleted project and a malformed id', function (): void {
    ['project' => $foreign] = chatChannelWorld();
    Workspace::forgetCurrent();
    ['workspace' => $ws, 'user' => $developer, 'project' => $project] = chatChannelWorld();
    $member = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => false, 'admin_level' => 'member']);
    $gone = Project::factory()->for($ws, 'workspace')->create(['created_by' => $developer->id, 'name' => 'Gone']);
    $gone->delete();
    $auth = fn (User $user, string $channel) => $this->actingAs($user)
        ->postJson('/broadcasting/auth', ['socket_id' => '1234.5678', 'channel_name' => $channel]);

    foreach (['private-project.', 'presence-project.'] as $prefix) {
        $auth($member, $prefix . $project->id)->assertForbidden();
        $auth($developer, $prefix . $foreign->id)->assertForbidden();
        $auth($developer, $prefix . $gone->id)->assertForbidden();
        $auth($developer, $prefix . 'not-a-uuid')->assertForbidden();
    }
});
