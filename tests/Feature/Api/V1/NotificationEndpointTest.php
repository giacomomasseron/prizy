<?php

declare(strict_types=1);

use App\Models\Notification;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
