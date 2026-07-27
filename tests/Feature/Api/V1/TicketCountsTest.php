<?php

declare(strict_types=1);

use App\Models\Contact;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:string,1:Workspace,2:User} */
function countsWorld(array $userAttrs = ['is_agent' => true]): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $userAttrs));
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws, $user];
}

function countsTicket(Workspace $ws, array $attrs): Ticket
{
    $contact = Contact::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'C', 'email' => 'c'.Str::uuid().'@x.com']);

    return Ticket::forceCreate(array_merge([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'requester_id' => $contact->id,
        'subject' => 'S', 'status' => 'open', 'priority' => 'high', 'channel' => 'email',
    ], $attrs));
}

it('returns per-status, per-channel, unassigned, and mine_unsolved counts', function (): void {
    [$token, $ws, $user] = countsWorld();
    countsTicket($ws, ['status' => 'open', 'channel' => 'email', 'assignee_id' => $user->id]);   // mine unsolved
    countsTicket($ws, ['status' => 'pending', 'channel' => 'chat', 'assignee_id' => $user->id]); // mine unsolved
    countsTicket($ws, ['status' => 'solved', 'channel' => 'email', 'assignee_id' => $user->id]); // NOT unsolved
    countsTicket($ws, ['status' => 'open', 'channel' => 'chat', 'assignee_id' => null]);         // unassigned

    $res = $this->withToken($token)->getJson('/v1/tickets/counts')->assertStatus(200);
    expect($res->json('data.by_status.open'))->toBe(2);
    expect($res->json('data.by_status.pending'))->toBe(1);
    expect($res->json('data.by_status.solved'))->toBe(1);
    expect($res->json('data.by_status.closed'))->toBe(0);   // present with 0
    expect($res->json('data.by_channel.email'))->toBe(2);
    expect($res->json('data.by_channel.chat'))->toBe(2);
    expect($res->json('data.by_channel.api'))->toBe(0);
    expect($res->json('data.unassigned'))->toBe(1);
    expect($res->json('data.mine_unsolved'))->toBe(2);      // solved one excluded

    Workspace::forgetCurrent();
});

it('resolves /tickets/counts to the counts action, not the show route', function (): void {
    [$token, $ws] = countsWorld();

    // A literal "counts" is NOT a valid ticket uuid; if the show route captured it this would 404.
    $this->withToken($token)->getJson('/v1/tickets/counts')
        ->assertStatus(200)
        ->assertJsonStructure(['data' => ['by_status', 'by_channel', 'unassigned', 'mine_unsolved']]);

    Workspace::forgetCurrent();
});

it('forbids a non-agent from counting tickets (403)', function (): void {
    [$token, $ws] = countsWorld(['is_agent' => false, 'admin_level' => 'owner']);

    $this->withToken($token)->getJson('/v1/tickets/counts')->assertStatus(403);

    Workspace::forgetCurrent();
});

it('isolates counts by workspace', function (): void {
    [$token, $wsA] = countsWorld();
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();
    countsTicket($wsB, ['status' => 'open']);
    $wsA->makeCurrent();

    $res = $this->withToken($token)->getJson('/v1/tickets/counts')->assertStatus(200);
    expect($res->json('data.by_status.open'))->toBe(0);

    Workspace::forgetCurrent();
});
