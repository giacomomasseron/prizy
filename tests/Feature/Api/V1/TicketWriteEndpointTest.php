<?php

declare(strict_types=1);

use App\Models\Contact;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:string,1:Workspace,2:User} */
function ticketWriteWorld(array $userAttrs): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $userAttrs));
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws, $user];
}

function seedWriteTicket(Workspace $ws, array $attrs = []): Ticket
{
    $contact = Contact::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Grace Okonkwo', 'email' => 'grace@northwind.com']);

    return Ticket::forceCreate(array_merge([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id,
        'requester_id' => $contact->id, 'subject' => 'Blank profile on escalation',
        'status' => 'open', 'priority' => 'urgent', 'channel' => 'email',
    ], $attrs));
}

it('lets an agent post a public reply and stamps first_replied_at', function (): void {
    [$token, $ws, $agent] = ticketWriteWorld(['is_agent' => true]);
    $ticket = seedWriteTicket($ws);
    expect($ticket->first_replied_at)->toBeNull();

    $res = $this->withToken($token)->postJson("/v1/tickets/{$ticket->id}/messages", [
        'body' => 'Thanks for reaching out — looking into it.',
    ])->assertStatus(201);

    expect($res->json('data.kind'))->toBe('agent');
    expect($res->json('data.body'))->toBe('Thanks for reaching out — looking into it.');

    $msg = TicketMessage::query()->where('ticket_id', $ticket->id)->first();
    expect($msg->sender_type)->toBe('user');
    expect($msg->sender_user_id)->toBe($agent->id);
    expect($msg->sender_contact_id)->toBeNull();
    expect($msg->is_internal)->toBeFalse();

    $ticket->refresh();
    expect($ticket->first_replied_at)->not->toBeNull();

    Workspace::forgetCurrent();
});

it('lets an agent post an internal note without stamping first_replied_at', function (): void {
    [$token, $ws] = ticketWriteWorld(['is_agent' => true]);
    $ticket = seedWriteTicket($ws);

    $res = $this->withToken($token)->postJson("/v1/tickets/{$ticket->id}/messages", [
        'body' => 'Escalating to eng.',
        'internal' => true,
    ])->assertStatus(201);

    expect($res->json('data.kind'))->toBe('note');

    $msg = TicketMessage::query()->where('ticket_id', $ticket->id)->first();
    expect($msg->is_internal)->toBeTrue();

    $ticket->refresh();
    expect($ticket->first_replied_at)->toBeNull();

    Workspace::forgetCurrent();
});

it('does not overwrite an existing first_replied_at on a later reply', function (): void {
    [$token, $ws] = ticketWriteWorld(['is_agent' => true]);
    $earlier = now()->subDay();
    $ticket = seedWriteTicket($ws, ['first_replied_at' => $earlier]);

    $this->withToken($token)->postJson("/v1/tickets/{$ticket->id}/messages", [
        'body' => 'Following up.',
    ])->assertStatus(201);

    $ticket->refresh();
    expect($ticket->first_replied_at->timestamp)->toBe($earlier->timestamp);

    Workspace::forgetCurrent();
});

it('forbids a non-agent from posting a message (403)', function (): void {
    [$token, $ws] = ticketWriteWorld(['is_agent' => false, 'admin_level' => 'owner']); // even an owner is blocked
    $ticket = seedWriteTicket($ws);

    $this->withToken($token)->postJson("/v1/tickets/{$ticket->id}/messages", ['body' => 'Hi'])
        ->assertStatus(403);

    expect(TicketMessage::query()->where('ticket_id', $ticket->id)->count())->toBe(0);

    Workspace::forgetCurrent();
});

it('returns 404 posting to a ticket in another workspace', function (): void {
    [$token, $wsA] = ticketWriteWorld(['is_agent' => true]);
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();                 // seed under wsB context (RLS)
    $other = seedWriteTicket($wsB);
    $wsA->makeCurrent();                 // restore actor tenant

    $this->withToken($token)->postJson("/v1/tickets/{$other->id}/messages", ['body' => 'Hi'])
        ->assertStatus(404);

    Workspace::forgetCurrent();
});

it('rejects an empty message body (422)', function (): void {
    [$token, $ws] = ticketWriteWorld(['is_agent' => true]);
    $ticket = seedWriteTicket($ws);

    $this->withToken($token)->postJson("/v1/tickets/{$ticket->id}/messages", ['body' => ''])
        ->assertStatus(422);

    Workspace::forgetCurrent();
});

it('forbids an unverified agent from posting a message (403)', function (): void {
    [$token, $ws] = ticketWriteWorld(['is_agent' => true, 'email_verified_at' => null]);
    $ticket = seedWriteTicket($ws);

    $this->withToken($token)->postJson("/v1/tickets/{$ticket->id}/messages", ['body' => 'Hi'])
        ->assertStatus(403);

    Workspace::forgetCurrent();
});

it('transitions status open→pending without setting resolved_at', function (): void {
    [$token, $ws] = ticketWriteWorld(['is_agent' => true]);
    $ticket = seedWriteTicket($ws, ['status' => 'open']);

    $this->withToken($token)->patchJson("/v1/tickets/{$ticket->id}", ['status' => 'pending'])
        ->assertStatus(200)
        ->assertJsonPath('data.status', 'pending');

    $ticket->refresh();
    expect($ticket->status)->toBe('pending');
    expect($ticket->resolved_at)->toBeNull();

    Workspace::forgetCurrent();
});

it('sets resolved_at when moving to solved and clears it when reopening', function (): void {
    [$token, $ws] = ticketWriteWorld(['is_agent' => true]);
    $ticket = seedWriteTicket($ws, ['status' => 'open']);

    $this->withToken($token)->patchJson("/v1/tickets/{$ticket->id}", ['status' => 'solved'])->assertStatus(200);
    $ticket->refresh();
    expect($ticket->resolved_at)->not->toBeNull();

    $this->withToken($token)->patchJson("/v1/tickets/{$ticket->id}", ['status' => 'open'])->assertStatus(200);
    $ticket->refresh();
    expect($ticket->resolved_at)->toBeNull();

    Workspace::forgetCurrent();
});

it('sets resolved_at when moving to closed', function (): void {
    [$token, $ws] = ticketWriteWorld(['is_agent' => true]);
    $ticket = seedWriteTicket($ws, ['status' => 'pending']);

    $this->withToken($token)->patchJson("/v1/tickets/{$ticket->id}", ['status' => 'closed'])->assertStatus(200);
    $ticket->refresh();
    expect($ticket->status)->toBe('closed');
    expect($ticket->resolved_at)->not->toBeNull();

    Workspace::forgetCurrent();
});

it('rejects an invalid status (422)', function (): void {
    [$token, $ws] = ticketWriteWorld(['is_agent' => true]);
    $ticket = seedWriteTicket($ws);

    $this->withToken($token)->patchJson("/v1/tickets/{$ticket->id}", ['status' => 'frozen'])
        ->assertStatus(422);

    Workspace::forgetCurrent();
});

it('forbids a non-agent from changing status (403)', function (): void {
    [$token, $ws] = ticketWriteWorld(['is_agent' => false, 'admin_level' => 'owner']);
    $ticket = seedWriteTicket($ws, ['status' => 'open']);

    $this->withToken($token)->patchJson("/v1/tickets/{$ticket->id}", ['status' => 'solved'])
        ->assertStatus(403);

    $ticket->refresh();
    expect($ticket->status)->toBe('open');

    Workspace::forgetCurrent();
});

it('returns 404 changing status on a ticket in another workspace', function (): void {
    [$token, $wsA] = ticketWriteWorld(['is_agent' => true]);
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();
    $other = seedWriteTicket($wsB);
    $wsA->makeCurrent();

    $this->withToken($token)->patchJson("/v1/tickets/{$other->id}", ['status' => 'solved'])
        ->assertStatus(404);

    Workspace::forgetCurrent();
});

it('forbids an unverified agent from changing status (403)', function (): void {
    [$token, $ws] = ticketWriteWorld(['is_agent' => true, 'email_verified_at' => null]);
    $ticket = seedWriteTicket($ws, ['status' => 'open']);

    $this->withToken($token)->patchJson("/v1/tickets/{$ticket->id}", ['status' => 'solved'])
        ->assertStatus(403);

    $ticket->refresh();
    expect($ticket->status)->toBe('open');

    Workspace::forgetCurrent();
});
