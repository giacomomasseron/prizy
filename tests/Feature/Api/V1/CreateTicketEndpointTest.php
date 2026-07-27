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
function createTicketWorld(array $userAttrs): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $userAttrs));
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws, $user];
}

function makeContact(Workspace $ws): Contact
{
    return Contact::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Grace Okonkwo', 'email' => 'grace@northwind.com']);
}

/** @return array<string, mixed> */
function validTicketPayload(Contact $contact): array
{
    return [
        'subject' => 'Cannot log in after SSO change',
        'requester_id' => $contact->id,
        'priority' => 'high',
        'channel' => 'email',
        'body' => 'None of our agents can log in since this morning.',
    ];
}

it('lets an agent create a ticket with a customer opening message', function (): void {
    [$token, $ws] = createTicketWorld(['is_agent' => true]);
    $contact = makeContact($ws);

    $res = $this->withToken($token)->postJson('/v1/tickets', validTicketPayload($contact))
        ->assertStatus(201)
        ->assertJsonPath('data.subject', 'Cannot log in after SSO change')
        ->assertJsonPath('data.status', 'new')
        ->assertJsonPath('data.priority', 'high')
        ->assertJsonPath('data.requester.id', $contact->id);
    expect($res->json('data.assignee'))->toBeNull();

    $ticket = Ticket::query()->where('subject', 'Cannot log in after SSO change')->first();
    expect($ticket->status)->toBe('new');
    expect($ticket->assignee_id)->toBeNull();
    expect($ticket->first_replied_at)->toBeNull();

    $msg = TicketMessage::query()->where('ticket_id', $ticket->id)->first();
    expect($msg->sender_type)->toBe('contact');
    expect($msg->sender_contact_id)->toBe($contact->id);
    expect($msg->sender_user_id)->toBeNull();
    expect($msg->is_internal)->toBeFalse();
    expect($msg->body)->toBe('None of our agents can log in since this morning.');

    // Shown, the opening message renders as a customer message (end-to-end kind check).
    $show = $this->withToken($token)->getJson("/v1/tickets/{$ticket->id}")->assertStatus(200);
    expect($show->json('data.messages'))->toHaveCount(1);
    expect($show->json('data.messages.0.kind'))->toBe('customer');

    Workspace::forgetCurrent();
});

it('forbids a non-agent from creating a ticket (403)', function (): void {
    [$token, $ws] = createTicketWorld(['is_agent' => false, 'admin_level' => 'owner']);
    $contact = makeContact($ws);

    $this->withToken($token)->postJson('/v1/tickets', validTicketPayload($contact))->assertStatus(403);
    expect(Ticket::query()->count())->toBe(0);

    Workspace::forgetCurrent();
});

it('forbids an unverified agent from creating a ticket (403)', function (): void {
    [$token, $ws] = createTicketWorld(['is_agent' => true, 'email_verified_at' => null]);
    $contact = makeContact($ws);

    $this->withToken($token)->postJson('/v1/tickets', validTicketPayload($contact))->assertStatus(403);

    Workspace::forgetCurrent();
});

it('rejects a requester from another workspace (422)', function (): void {
    [$token, $wsA] = createTicketWorld(['is_agent' => true]);
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();
    $otherContact = makeContact($wsB);
    $wsA->makeCurrent();

    $this->withToken($token)->postJson('/v1/tickets', validTicketPayload($otherContact))
        ->assertStatus(422)
        ->assertJsonValidationErrors('requester_id');

    Workspace::forgetCurrent();
});

it('validates required fields and enums (422)', function (): void {
    [$token, $ws] = createTicketWorld(['is_agent' => true]);
    $contact = makeContact($ws);

    $this->withToken($token)->postJson('/v1/tickets', ['requester_id' => $contact->id, 'priority' => 'high', 'channel' => 'email'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['subject', 'body']);

    $this->withToken($token)->postJson('/v1/tickets', array_merge(validTicketPayload($contact), ['priority' => 'sky-high', 'channel' => 'telepathy']))
        ->assertStatus(422)
        ->assertJsonValidationErrors(['priority', 'channel']);

    Workspace::forgetCurrent();
});
