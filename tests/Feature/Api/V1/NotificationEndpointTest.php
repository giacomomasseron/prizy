<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Notification;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:string,1:Workspace,2:User} */
function notifWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws, $user];
}

function makeNotif(Workspace $ws, User $user, array $attrs = []): Notification
{
    return Notification::create(array_merge([
        'id' => (string) Str::uuid(), 'user_id' => $user->id,
        'type' => 'issue_assigned', 'subject_type' => 'issue', 'subject_id' => (string) Str::uuid(),
    ], $attrs));
}

it('lists only the current user notifications and filters unread', function (): void {
    [$token, $ws, $user] = notifWorld();
    $unread = makeNotif($ws, $user);
    makeNotif($ws, $user, ['read_at' => now()]);
    // A second user's notification in the SAME workspace must not appear.
    $other = User::factory()->for($ws, 'workspace')->create();
    makeNotif($ws, $other);

    $all = $this->withToken($token)->getJson('/v1/notifications');
    $all->assertStatus(200)->assertJsonCount(2, 'data');

    $this->withToken($token)->getJson('/v1/notifications?filter[unread]=true')
        ->assertStatus(200)->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $unread->id);

    Workspace::forgetCurrent();
});

it('reports the unread count and clears it on mark-read / read-all', function (): void {
    [$token, $ws, $user] = notifWorld();
    $a = makeNotif($ws, $user);
    $b = makeNotif($ws, $user);

    $this->withToken($token)->getJson('/v1/notifications/unread-count')
        ->assertStatus(200)->assertJsonPath('data.count', 2);

    $this->withToken($token)->postJson("/v1/notifications/{$a->id}/read")
        ->assertStatus(200)->assertJsonPath('data.read_at', fn ($v) => $v !== null);
    $this->withToken($token)->getJson('/v1/notifications/unread-count')->assertJsonPath('data.count', 1);

    $this->withToken($token)->postJson('/v1/notifications/read-all')->assertStatus(204);
    $this->withToken($token)->getJson('/v1/notifications/unread-count')->assertJsonPath('data.count', 0);

    Workspace::forgetCurrent();
});

it('404s when marking another user notification read', function (): void {
    [$token, $ws, $user] = notifWorld();
    $other = User::factory()->for($ws, 'workspace')->create();
    $foreign = makeNotif($ws, $other);

    $this->withToken($token)->postJson("/v1/notifications/{$foreign->id}/read")->assertStatus(404);

    Workspace::forgetCurrent();
});

it('enriches the index payload with actor, body and a resolved issue subject', function (): void {
    [$token, $ws, $user] = notifWorld();
    $actor = User::factory()->for($ws, 'workspace')->create(['name' => 'Ada Actor']);
    $issue = Issue::factory()->for($ws, 'workspace')->create(['title' => 'Fix the login bug', 'created_by' => $user->id]);

    $notif = makeNotif($ws, $user, [
        'actor_id' => $actor->id,
        'body' => 'assigned you to an issue',
        'subject_type' => 'issue',
        'subject_id' => $issue->id,
    ]);

    $this->withToken($token)->getJson('/v1/notifications')
        ->assertStatus(200)
        ->assertJsonPath('data.0.id', $notif->id)
        ->assertJsonPath('data.0.body', 'assigned you to an issue')
        ->assertJsonPath('data.0.actor', ['id' => $actor->id, 'name' => 'Ada Actor'])
        ->assertJsonPath('data.0.subject', [
            'type' => 'issue',
            'id' => $issue->id,
            // `identifier` is not a persisted issue column (yet) — ref always falls back to the
            // uppercased id prefix, matching the frontend fallback (IssueResource/PeekDrawer).
            'ref' => strtoupper(substr($issue->id, 0, 6)),
            'title' => 'Fix the login bug',
            'path' => "/issues/{$issue->id}",
        ]);

    Workspace::forgetCurrent();
});

it('nulls actor and subject when the actor is absent or the subject is unresolvable', function (): void {
    [$token, $ws, $user] = notifWorld();

    // No actor, no body, and an issue id that does not exist.
    $orphan = makeNotif($ws, $user, ['subject_id' => (string) Str::uuid()]);
    // A subject_type the resource does not resolve at all.
    $other = makeNotif($ws, $user, ['subject_type' => 'ticket', 'subject_id' => (string) Str::uuid()]);

    $response = $this->withToken($token)->getJson('/v1/notifications')->assertStatus(200);

    $byId = collect($response->json('data'))->keyBy('id');
    expect($byId[$orphan->id]['actor'])->toBeNull();
    expect($byId[$orphan->id]['body'])->toBeNull();
    expect($byId[$orphan->id]['subject'])->toBeNull();
    expect($byId[$other->id]['subject'])->toBeNull();

    Workspace::forgetCurrent();
});

it('includes snoozed_until and archived_at in the index payload, null by default', function (): void {
    [$token, $ws, $user] = notifWorld();
    $notif = makeNotif($ws, $user);

    $this->withToken($token)->getJson('/v1/notifications')
        ->assertStatus(200)
        ->assertJsonPath('data.0.id', $notif->id)
        ->assertJsonPath('data.0.snoozed_until', null)
        ->assertJsonPath('data.0.archived_at', null);

    Workspace::forgetCurrent();
});

it('serializes snoozed_until and archived_at as ISO strings when set', function (): void {
    [$token, $ws, $user] = notifWorld();
    $notif = makeNotif($ws, $user, ['snoozed_until' => now()->addDay(), 'archived_at' => now()]);
    $fresh = $notif->fresh();

    $this->withToken($token)->getJson('/v1/notifications')
        ->assertStatus(200)
        ->assertJsonPath('data.0.snoozed_until', $fresh->snoozed_until->toISOString())
        ->assertJsonPath('data.0.archived_at', $fresh->archived_at->toISOString());

    Workspace::forgetCurrent();
});

it('resolves issue subjects for a page of notifications with a single batch query (no N+1)', function (): void {
    [$token, $ws, $user] = notifWorld();
    $issues = Issue::factory()->for($ws, 'workspace')->count(4)->create(['created_by' => $user->id]);
    foreach ($issues as $issue) {
        makeNotif($ws, $user, ['subject_id' => $issue->id]);
    }
    // Plus one pointing at a missing issue, to prove it doesn't add a query of its own.
    makeNotif($ws, $user, ['subject_id' => (string) Str::uuid()]);

    DB::enableQueryLog();
    $this->withToken($token)->getJson('/v1/notifications')->assertStatus(200)->assertJsonCount(5, 'data');
    $issuesQueries = collect(DB::getQueryLog())->filter(fn (array $q): bool => str_contains($q['query'], 'from "issues"'));
    DB::disableQueryLog();

    expect($issuesQueries)->toHaveCount(1);

    Workspace::forgetCurrent();
});
