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

afterEach(fn () => Workspace::forgetCurrent());

/** @return array{0:string,1:Workspace,2:User} */
function assignTicketWorld(array $userAttrs = ['is_agent' => true], bool $helpdeskEnabled = true): array
{
    $ws = Workspace::factory()->create(['helpdesk_enabled' => $helpdeskEnabled]);
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $userAttrs));
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws, $user];
}

function assignTicketSeed(Workspace $ws, array $attrs = []): Ticket
{
    $contact = Contact::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Raj Patel', 'email' => 'raj@contoso.io']);

    return Ticket::forceCreate(array_merge([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id,
        'requester_id' => $contact->id, 'subject' => 'Cannot invite new agents',
        'status' => 'new', 'priority' => 'high', 'channel' => 'chat',
    ], $attrs));
}

function assignTicketColleague(Workspace $ws, array $attrs): User
{
    return User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $attrs));
}

it('lets an agent assign an unassigned ticket to themselves', function (): void {
    [$token, $ws, $agent] = assignTicketWorld(['is_agent' => true, 'name' => 'Alex Rivera']);
    $ticket = assignTicketSeed($ws);

    $this->withToken($token)->putJson("/v1/tickets/{$ticket->id}/assignee", ['assignee_id' => $agent->id])
        ->assertStatus(200)
        ->assertJsonPath('data.id', $ticket->id)
        ->assertJsonPath('data.assignee.id', $agent->id)
        ->assertJsonPath('data.assignee.name', 'Alex Rivera');

    expect($ticket->refresh()->assignee_id)->toBe($agent->id);
});

it('lets an agent hand a ticket to another agent', function (): void {
    [$token, $ws, $agent] = assignTicketWorld();
    $maya = assignTicketColleague($ws, ['is_agent' => true, 'name' => 'Maya Chen']);
    $ticket = assignTicketSeed($ws, ['assignee_id' => $agent->id]);

    $this->withToken($token)->putJson("/v1/tickets/{$ticket->id}/assignee", ['assignee_id' => $maya->id])
        ->assertStatus(200)
        ->assertJsonPath('data.assignee.name', 'Maya Chen');

    expect($ticket->refresh()->assignee_id)->toBe($maya->id);
});

it('unassigns a ticket with a null assignee', function (): void {
    [$token, $ws, $agent] = assignTicketWorld();
    $ticket = assignTicketSeed($ws, ['assignee_id' => $agent->id]);

    $this->withToken($token)->putJson("/v1/tickets/{$ticket->id}/assignee", ['assignee_id' => null])
        ->assertStatus(200)
        ->assertJsonPath('data.assignee', null);

    expect($ticket->refresh()->assignee_id)->toBeNull();
});

it('lets an admin agent assign', function (): void {
    [$token, $ws, $admin] = assignTicketWorld(['is_agent' => true, 'admin_level' => 'admin']);
    $ticket = assignTicketSeed($ws);

    $this->withToken($token)->putJson("/v1/tickets/{$ticket->id}/assignee", ['assignee_id' => $admin->id])->assertStatus(200);

    expect($ticket->refresh()->assignee_id)->toBe($admin->id);
});

// The PRD's Assignee is a single agent: someone who can actually work the ticket.
it('refuses an assignee who cannot work tickets (422)', function (array $attrs): void {
    [$token, $ws] = assignTicketWorld();
    $other = assignTicketColleague($ws, $attrs);
    $ticket = assignTicketSeed($ws);

    $this->withToken($token)->putJson("/v1/tickets/{$ticket->id}/assignee", ['assignee_id' => $other->id])
        ->assertStatus(422)
        ->assertJsonValidationErrors('assignee_id');

    expect($ticket->refresh()->assignee_id)->toBeNull();
})->with([
    'a member without the agent capability' => [['is_agent' => false, 'is_developer' => true]],
    'an owner without the agent capability' => [['is_agent' => false, 'admin_level' => 'owner']],
    'a viewer who is an agent' => [['is_agent' => true, 'admin_level' => 'viewer']],
]);

it('refuses an assignee from another workspace (422)', function (): void {
    [$token, $wsA] = assignTicketWorld();
    $ticket = assignTicketSeed($wsA);
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();
    $stranger = assignTicketColleague($wsB, ['is_agent' => true]);
    $wsA->makeCurrent();

    $this->withToken($token)->putJson("/v1/tickets/{$ticket->id}/assignee", ['assignee_id' => $stranger->id])
        ->assertStatus(422)
        ->assertJsonValidationErrors('assignee_id');

    expect($ticket->refresh()->assignee_id)->toBeNull();
});

it('validates the payload (422)', function (array $payload): void {
    [$token, $ws] = assignTicketWorld();
    $ticket = assignTicketSeed($ws);

    $this->withToken($token)->putJson("/v1/tickets/{$ticket->id}/assignee", $payload)
        ->assertStatus(422)
        ->assertJsonValidationErrors('assignee_id');
})->with([
    'missing' => [[]],
    'not a uuid' => [['assignee_id' => 'alex']],
]);

it('forbids anyone who cannot work tickets from assigning (403)', function (array $attrs): void {
    [$token, $ws, $actor] = assignTicketWorld($attrs);
    $agent = assignTicketColleague($ws, ['is_agent' => true]);
    $ticket = assignTicketSeed($ws);

    $this->withToken($token)->putJson("/v1/tickets/{$ticket->id}/assignee", ['assignee_id' => $agent->id])
        ->assertStatus(403);

    expect($ticket->refresh()->assignee_id)->toBeNull();
})->with([
    'a member without the agent capability' => [['is_agent' => false, 'is_developer' => true]],
    'an owner without the agent capability' => [['is_agent' => false, 'admin_level' => 'owner']],
    'a viewer who is an agent' => [['is_agent' => true, 'admin_level' => 'viewer']],
    'an unverified agent' => [['is_agent' => true, 'email_verified_at' => null]],
]);

it('forbids assigning while the helpdesk is off (403)', function (): void {
    [$token, $ws, $agent] = assignTicketWorld(helpdeskEnabled: false);
    $ticket = assignTicketSeed($ws);

    $this->withToken($token)->putJson("/v1/tickets/{$ticket->id}/assignee", ['assignee_id' => $agent->id])
        ->assertStatus(403);

    expect($ticket->refresh()->assignee_id)->toBeNull();
});

it('returns 404 for a ticket in another workspace', function (): void {
    [$token, $wsA, $agent] = assignTicketWorld();
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();
    $other = assignTicketSeed($wsB);
    $wsA->makeCurrent();

    $this->withToken($token)->putJson("/v1/tickets/{$other->id}/assignee", ['assignee_id' => $agent->id])
        ->assertStatus(404);

    $wsB->makeCurrent();
    expect($other->refresh()->assignee_id)->toBeNull();
});
