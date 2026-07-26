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
