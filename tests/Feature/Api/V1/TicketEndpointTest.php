<?php

declare(strict_types=1);

use App\Models\Contact;
use App\Models\Ticket;
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
function ticketWorld(array $userAttrs): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $userAttrs));
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws, $user];
}

function seedTicket(Workspace $ws, string $subject = 'Blank profile on escalation'): Ticket
{
    $contact = Contact::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Grace Okonkwo', 'email' => 'grace@northwind.com']);

    return Ticket::forceCreate([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id,
        'requester_id' => $contact->id, 'subject' => $subject,
        'status' => 'open', 'priority' => 'urgent', 'channel' => 'email',
    ]);
}

it('lists tickets for an agent', function (): void {
    [$token, $ws] = ticketWorld(['is_agent' => true]);
    seedTicket($ws);

    $this->withToken($token)->getJson('/v1/tickets')
        ->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.subject', 'Blank profile on escalation')
        ->assertJsonPath('data.0.status', 'open')
        ->assertJsonPath('data.0.requester.name', 'Grace Okonkwo');

    Workspace::forgetCurrent();
});

it('forbids a non-agent from listing tickets (403)', function (): void {
    [$token, $ws] = ticketWorld(['is_agent' => false, 'admin_level' => 'owner']); // even an owner is blocked
    seedTicket($ws);

    $this->withToken($token)->getJson('/v1/tickets')->assertStatus(403);

    Workspace::forgetCurrent();
});

it('does not leak tickets from another workspace', function (): void {
    [$token, $wsA] = ticketWorld(['is_agent' => true]);
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();                              // seed wsB rows under wsB's RLS/GUC context (else RLS blocks the insert)
    seedTicket($wsB, 'Other workspace ticket');
    $wsA->makeCurrent();                              // restore the actor's tenant for the HTTP request

    $this->withToken($token)->getJson('/v1/tickets')->assertStatus(200)->assertJsonCount(0, 'data');

    Workspace::forgetCurrent();
});

it('shows a ticket with its messages for an agent', function (): void {
    [$token, $ws] = ticketWorld(['is_agent' => true]);
    $ticket = seedTicket($ws);
    $contact = $ticket->requester;
    $agent = User::factory()->for($ws, 'workspace')->create(['is_agent' => true]);
    // NOTE: each row includes both sender_*_id keys (null where unused). DB::table()->insert()
    // ksort()s each row's keys individually but derives the column list from the first row only —
    // rows with a DIFFERENT key SET (not just order) silently misalign values into the wrong
    // columns (e.g. the 'user' sender_type string lands in the uuid sender_contact_id column).
    DB::table('ticket_messages')->insert([
        ['id' => (string) Str::uuid(), 'ticket_id' => $ticket->id, 'sender_type' => 'contact', 'sender_contact_id' => $contact->id, 'sender_user_id' => null, 'body' => 'Profile is blank.', 'is_internal' => false, 'channel' => 'email', 'created_at' => now()->subHours(2), 'updated_at' => now()->subHours(2)],
        ['id' => (string) Str::uuid(), 'ticket_id' => $ticket->id, 'sender_type' => 'user', 'sender_contact_id' => null, 'sender_user_id' => $agent->id, 'body' => 'Looking into it.', 'is_internal' => false, 'channel' => 'email', 'created_at' => now()->subHour(), 'updated_at' => now()->subHour()],
        ['id' => (string) Str::uuid(), 'ticket_id' => $ticket->id, 'sender_type' => 'user', 'sender_contact_id' => null, 'sender_user_id' => $agent->id, 'body' => 'Escalated to eng.', 'is_internal' => true, 'channel' => 'email', 'created_at' => now(), 'updated_at' => now()],
    ]);

    $res = $this->withToken($token)->getJson("/v1/tickets/{$ticket->id}")->assertStatus(200);
    expect($res->json('data.messages'))->toHaveCount(3);
    expect(collect($res->json('data.messages'))->pluck('kind')->all())->toBe(['customer', 'agent', 'note']);

    Workspace::forgetCurrent();
});

it('forbids a non-agent from viewing a ticket (403)', function (): void {
    [$token, $ws] = ticketWorld(['is_agent' => false]);
    $ticket = seedTicket($ws);

    $this->withToken($token)->getJson("/v1/tickets/{$ticket->id}")->assertStatus(403);

    Workspace::forgetCurrent();
});

it('returns 404 for a ticket in another workspace', function (): void {
    [$token, $wsA] = ticketWorld(['is_agent' => true]);
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();                 // seed under wsB context (RLS)
    $other = seedTicket($wsB);
    $wsA->makeCurrent();                 // restore actor tenant

    $this->withToken($token)->getJson("/v1/tickets/{$other->id}")->assertStatus(404);

    Workspace::forgetCurrent();
});
