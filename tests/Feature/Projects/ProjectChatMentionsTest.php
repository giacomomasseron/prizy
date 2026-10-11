<?php

declare(strict_types=1);

use App\Events\NotificationCreated;
use App\Models\Notification;
use App\Models\Project;
use App\Models\User;
use App\Models\Workspace;
use App\Repositories\NotificationPreferenceRepository;
use App\Repositories\NotificationSubscriptionRepository;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/**
 * An author (Alex Rivera), three developers (Maya Chen, Priya Patel, Leon King), a support agent without tracker
 * access (Sam Agent) and a project.
 *
 * @return array{author:User, maya:User, priya:User, leon:User, sam:User, project:Project, token:Closure(User):string}
 */
function mentionWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $make = fn (string $name, array $attrs = ['is_developer' => true]): User => User::factory()->for($ws, 'workspace')
        ->create(array_merge(['name' => $name, 'email_verified_at' => now()], $attrs));
    $author = $make('Alex Rivera');

    return [
        'author' => $author,
        'maya' => $make('Maya Chen'),
        'priya' => $make('Priya Patel'),
        'leon' => $make('Leon King'),
        'sam' => $make('Sam Agent', ['is_developer' => false, 'is_agent' => true]),
        'project' => Project::factory()->for($ws, 'workspace')->create(['created_by' => $author->id, 'name' => 'Unified Inbox']),
        'token' => fn (User $user): string => app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'],
    ];
}

/** @return list<string> the users holding a project_mentioned notification, sorted */
function mentionedUserIds(): array
{
    return Notification::query()->where('type', 'project_mentioned')->pluck('user_id')->map(fn ($id) => (string) $id)->sort()->values()->all();
}

afterEach(fn () => Workspace::forgetCurrent());

it('notifies the tracker users a message mentions: not the author, not someone without tracker access', function (): void {
    Event::fake([NotificationCreated::class]);
    ['author' => $author, 'maya' => $maya, 'project' => $project, 'token' => $token] = mentionWorld();

    $id = $this->withToken($token($author))->postJson("/v1/projects/{$project->id}/messages", ['body' => 'Hey @Maya Chen, @Sam Agent and @Alex Rivera'])
        ->assertStatus(201)->json('data.id');

    expect(mentionedUserIds())->toBe([$maya->id]);
    $notification = Notification::query()->where('user_id', $maya->id)->firstOrFail();
    expect($notification->subject_type)->toBe('project_message');
    expect($notification->subject_id)->toBe($id);
    expect($notification->actor_id)->toBe($author->id);
    expect($notification->body)->toBe('Hey @Maya Chen, @Sam Agent and @Alex Rivera');
    Event::assertDispatched(NotificationCreated::class, fn (NotificationCreated $e): bool => $e->userId === $maya->id && $e->type === 'project_mentioned');
});

it('notifies nobody for an ordinary message', function (): void {
    ['author' => $author, 'project' => $project, 'token' => $token] = mentionWorld();

    $this->withToken($token($author))->postJson("/v1/projects/{$project->id}/messages", ['body' => 'Shipping today'])->assertStatus(201);

    expect(Notification::query()->count())->toBe(0);
});

it('notifies only the people an edit newly mentions, never someone already notified for the message', function (): void {
    ['author' => $author, 'maya' => $maya, 'priya' => $priya, 'project' => $project, 'token' => $token] = mentionWorld();
    $alex = $token($author);
    $id = $this->withToken($alex)->postJson("/v1/projects/{$project->id}/messages", ['body' => 'Ping @Maya Chen'])->json('data.id');
    $url = "/v1/projects/{$project->id}/messages/{$id}";

    $this->withToken($alex)->patchJson($url, ['body' => 'Ping @Maya Chen and @Priya Patel'])->assertStatus(200);
    expect(mentionedUserIds())->toBe(collect([$maya->id, $priya->id])->sort()->values()->all());

    // Maya leaves the message and comes back: she was already notified for it.
    $this->withToken($alex)->patchJson($url, ['body' => 'Ping @Priya Patel'])->assertStatus(200);
    $this->withToken($alex)->patchJson($url, ['body' => 'Ping @Maya Chen'])->assertStatus(200);
    expect(Notification::query()->where('user_id', $maya->id)->count())->toBe(1);
    expect(Notification::query()->where('user_id', $priya->id)->count())->toBe(1);
});

it('follows the mention preference and the project subscription level ("off" blocks it, "mentions only" lets it through)', function (): void {
    ['author' => $author, 'maya' => $maya, 'priya' => $priya, 'leon' => $leon, 'project' => $project, 'token' => $token] = mentionWorld();
    app(NotificationPreferenceRepository::class)->setPreference($maya->id, 'mention', 'in_app', false);
    app(NotificationSubscriptionRepository::class)->setSubscription($priya->id, 'project', $project->id, 'off');
    app(NotificationSubscriptionRepository::class)->setSubscription($leon->id, 'project', $project->id, 'mentions');

    $this->withToken($token($author))->postJson("/v1/projects/{$project->id}/messages", ['body' => '@Maya Chen @Priya Patel @Leon King'])->assertStatus(201);

    expect(mentionedUserIds())->toBe([$leon->id]);
});

it('is a mention in the inbox: the Mentions filter lists it, and it opens the chat at the message', function (): void {
    ['author' => $author, 'maya' => $maya, 'project' => $project, 'token' => $token] = mentionWorld();
    $id = $this->withToken($token($author))->postJson("/v1/projects/{$project->id}/messages", ['body' => 'Can you look, @Maya Chen?'])->json('data.id');

    $this->withToken($token($maya))->getJson('/v1/notifications?filter[category]=mention')
        ->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.type', 'project_mentioned')
        ->assertJsonPath('data.0.subject.type', 'project_message')
        ->assertJsonPath('data.0.subject.ref', 'Unified Inbox chat')
        ->assertJsonPath('data.0.subject.title', 'Can you look, @Maya Chen?')
        ->assertJsonPath('data.0.subject.path', "/projects/{$project->id}/chat?message={$id}");
});

it('drops the link once the message is deleted', function (): void {
    ['author' => $author, 'maya' => $maya, 'project' => $project, 'token' => $token] = mentionWorld();
    $alex = $token($author);
    $id = $this->withToken($alex)->postJson("/v1/projects/{$project->id}/messages", ['body' => '@Maya Chen oops'])->json('data.id');

    $this->withToken($alex)->deleteJson("/v1/projects/{$project->id}/messages/{$id}")->assertStatus(204);

    $this->withToken($token($maya))->getJson('/v1/notifications')
        ->assertStatus(200)
        ->assertJsonPath('data.0.type', 'project_mentioned')
        ->assertJsonPath('data.0.subject', null);
});

it('never lets a first name reach a developer when the full name of someone without tracker access claims it', function (): void {
    ['author' => $author, 'sam' => $samAgent, 'project' => $project, 'token' => $token] = mentionWorld();
    $samLee = User::factory()->for($author->workspace, 'workspace')
        ->create(['name' => 'Sam Lee', 'email_verified_at' => now(), 'is_developer' => true]);
    $alex = $token($author);

    // "@Sam Agent" claims its text, so "@Sam" cannot match Sam Lee; Sam Agent has no tracker access.
    $this->withToken($alex)->postJson("/v1/projects/{$project->id}/messages", ['body' => '@Sam Agent can you check the logs?'])->assertStatus(201);
    expect(mentionedUserIds())->toBe([]);

    $this->withToken($alex)->postJson("/v1/projects/{$project->id}/messages", ['body' => '@Sam Lee and @Sam Agent'])->assertStatus(201);
    expect(mentionedUserIds())->toBe([$samLee->id]);
    expect(Notification::query()->where('user_id', $samAgent->id)->count())->toBe(0);
});
