<?php

declare(strict_types=1);

use App\Models\Contact;
use App\Models\Issue;
use App\Models\Team;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @param array<string, mixed> $attrs */
function portalReqTicket(Workspace $ws, Contact $contact, array $attrs = []): Ticket
{
    return Ticket::forceCreate(array_merge([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'requester_id' => $contact->id,
        'subject' => 'Sample request', 'status' => 'open', 'priority' => 'normal', 'channel' => 'email',
        'created_at' => now(), 'updated_at' => now(),
    ], $attrs));
}

/** @param array{internal?: bool, from?: string, body?: string, user?: User, at?: Carbon} $opts */
function portalReqMessage(Ticket $ticket, array $opts = []): TicketMessage
{
    $fromAgent = ($opts['from'] ?? 'contact') === 'agent';
    $at = $opts['at'] ?? now();

    return TicketMessage::forceCreate([
        'id' => (string) Str::uuid(),
        'ticket_id' => $ticket->id,
        'sender_type' => $fromAgent ? 'user' : 'contact',
        'sender_user_id' => $fromAgent ? $opts['user']->id : null,
        'sender_contact_id' => $fromAgent ? null : $ticket->requester_id,
        'body' => $opts['body'] ?? 'Message body',
        'is_internal' => $opts['internal'] ?? false,
        'channel' => $ticket->channel,
        'created_at' => $at,
        'updated_at' => $at,
    ]);
}

it('lists only the contact\'s own tickets with filters, counts, and search', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    portalReqTicket($ws, $contact, ['subject' => 'Cannot log into dashboard', 'status' => 'open']);
    portalReqTicket($ws, $contact, ['subject' => 'Feature request: dark mode', 'status' => 'new']);
    portalReqTicket($ws, $contact, ['subject' => 'Invoice question resolved', 'status' => 'solved', 'resolved_at' => now()]);

    $foreignContact = portalContact($ws, 'other@example.com');
    portalReqTicket($ws, $foreignContact, ['subject' => 'Foreign secret request']);

    $this->actingAs($contact, 'contact');

    $all = $this->get('/help/requests')->assertOk();
    $all->assertSee('Cannot log into dashboard');
    $all->assertSee('Feature request: dark mode');
    $all->assertSee('Invoice question resolved');
    $all->assertDontSee('Foreign secret request');
    $all->assertSee('All (3)');
    $all->assertSee('Open (2)');
    $all->assertSee('Solved (1)');

    $open = $this->get('/help/requests?f=open')->assertOk();
    $open->assertSee('Cannot log into dashboard');
    $open->assertSee('Feature request: dark mode');
    $open->assertDontSee('Invoice question resolved');

    $solved = $this->get('/help/requests?f=solved')->assertOk();
    $solved->assertSee('Invoice question resolved');
    $solved->assertDontSee('Cannot log into dashboard');
    $solved->assertDontSee('Feature request: dark mode');

    $searched = $this->get('/help/requests?q=dark+mode')->assertOk();
    $searched->assertSee('Feature request: dark mode');
    $searched->assertDontSee('Cannot log into dashboard');
    $searched->assertDontSee('Invoice question resolved');

    Workspace::forgetCurrent();
});

it('404s another contact\'s ticket by direct id', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    $foreign = portalContact($ws, 'other@example.com');
    $foreignTicket = portalReqTicket($ws, $foreign);

    $this->actingAs($contact, 'contact');
    $this->get("/help/requests/{$foreignTicket->id}")->assertNotFound();

    Workspace::forgetCurrent();
});

it('shows the conversation without internal notes (LEAK TEST)', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    $agent = User::factory()->for($ws, 'workspace')->create();
    $ticket = portalReqTicket($ws, $contact);
    portalReqMessage($ticket, ['from' => 'agent', 'user' => $agent, 'body' => 'Here is the public fix for your issue.']);
    portalReqMessage($ticket, ['from' => 'agent', 'user' => $agent, 'internal' => true, 'body' => 'INTERNAL: secret handling']);

    $this->actingAs($contact, 'contact');
    $res = $this->get("/help/requests/{$ticket->id}")->assertOk();
    $res->assertSee('Here is the public fix for your issue.');
    $res->assertDontSee('INTERNAL: secret handling');

    Workspace::forgetCurrent();
});

it('marks seen on view and clears the unread badge, preserving updated_at', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    $agent = User::factory()->for($ws, 'workspace')->create();
    $ticket = portalReqTicket($ws, $contact, ['subject' => 'Reply pending review', 'updated_at' => now()->subHour()]);
    portalReqMessage($ticket, ['from' => 'agent', 'user' => $agent, 'body' => 'We fixed it.', 'at' => now()->subMinutes(30)]);
    $ticket->refresh();
    $updatedAtBefore = $ticket->updated_at;

    $this->actingAs($contact, 'contact');
    $this->get('/help/requests')->assertOk()->assertSee('New reply');

    $this->get("/help/requests/{$ticket->id}")->assertOk();

    $this->get('/help/requests')->assertOk()->assertDontSee('New reply');

    $ticket->refresh();
    expect($ticket->contact_seen_at)->not->toBeNull();
    expect($ticket->updated_at->equalTo($updatedAtBefore))->toBeTrue();

    Workspace::forgetCurrent();
});

it('shows derived events in timestamp order', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $agent = User::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $agent->id]);

    $ticket = portalReqTicket($ws, $contact, [
        'created_at' => now()->subDays(3),
        'status' => 'solved',
        'resolved_at' => now()->subDay(),
    ]);
    DB::table('issue_ticket_links')->insert([
        'issue_id' => $issue->id, 'ticket_id' => $ticket->id, 'created_by' => $agent->id,
        'created_at' => now()->subDays(2),
    ]);

    $this->actingAs($contact, 'contact');
    $res = $this->get("/help/requests/{$ticket->id}")->assertOk();
    $res->assertSeeInOrder(['Request received', 'Escalated to our engineering team', 'Request marked as solved']);

    Workspace::forgetCurrent();
});

it('replies: creates a portal message, reopens solved, never touches first_replied_at', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    // Truncate to whole seconds up front: the datetime cast round-trips through
    // Postgres at second precision, so comparing against a microsecond-precision
    // in-memory Carbon (never refreshed) would spuriously fail equalTo().
    $firstRepliedAt = now()->subDays(2)->startOfSecond();
    $ticket = portalReqTicket($ws, $contact, [
        'status' => 'solved', 'resolved_at' => now()->subDay(), 'first_replied_at' => $firstRepliedAt,
    ]);

    $this->actingAs($contact, 'contact');
    $this->post("/help/requests/{$ticket->id}/reply", ['body' => 'Actually this broke again.'])
        ->assertRedirect("/help/requests/{$ticket->id}");

    $ticket->refresh();
    expect($ticket->status)->toBe('open');
    expect($ticket->resolved_at)->toBeNull();
    expect($ticket->first_replied_at->equalTo($firstRepliedAt))->toBeTrue();

    $message = TicketMessage::where('ticket_id', $ticket->id)->latest('created_at')->first();
    expect($message)->not->toBeNull();
    expect($message->sender_type)->toBe('contact');
    expect($message->sender_contact_id)->toBe($contact->id);
    expect($message->sender_user_id)->toBeNull();
    expect($message->channel)->toBe('portal');
    expect($message->is_internal)->toBeFalse();
    expect($message->body)->toBe('Actually this broke again.');

    Workspace::forgetCurrent();
});

it('rejects an empty reply', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    $ticket = portalReqTicket($ws, $contact);

    $this->actingAs($contact, 'contact');
    $this->post("/help/requests/{$ticket->id}/reply", ['body' => '   '])
        ->assertSessionHasErrors('body');

    expect(TicketMessage::where('ticket_id', $ticket->id)->count())->toBe(0);

    Workspace::forgetCurrent();
});

it('solves own ticket idempotently without sending CSAT', function (): void {
    Notification::fake();
    $ws = portalWorld();
    $contact = portalContact($ws);
    $ticket = portalReqTicket($ws, $contact, ['status' => 'open']);

    $this->actingAs($contact, 'contact');
    $this->post("/help/requests/{$ticket->id}/solve")->assertRedirect("/help/requests/{$ticket->id}");
    $ticket->refresh();
    expect($ticket->status)->toBe('solved');
    expect($ticket->resolved_at)->not->toBeNull();
    $firstResolvedAt = $ticket->resolved_at;

    $this->post("/help/requests/{$ticket->id}/solve")->assertRedirect("/help/requests/{$ticket->id}");
    $ticket->refresh();
    expect($ticket->status)->toBe('solved');
    expect($ticket->resolved_at->equalTo($firstResolvedAt))->toBeTrue();

    Notification::assertNothingSent();

    Workspace::forgetCurrent();
});

it('guests cannot reach any request route', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    $ticket = portalReqTicket($ws, $contact);

    $this->get('/help/requests')->assertRedirect('/help/login');
    $this->get("/help/requests/{$ticket->id}")->assertRedirect('/help/login');
    $this->post("/help/requests/{$ticket->id}/reply", ['body' => 'hi'])->assertRedirect('/help/login');
    $this->post("/help/requests/{$ticket->id}/solve")->assertRedirect('/help/login');

    Workspace::forgetCurrent();
});

it('home shows recent requests only when signed in', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    portalReqTicket($ws, $contact, ['subject' => 'Recent four oldest not shown', 'updated_at' => now()->subHours(4)]);
    portalReqTicket($ws, $contact, ['subject' => 'Recent three', 'updated_at' => now()->subHours(3)]);
    portalReqTicket($ws, $contact, ['subject' => 'Recent two', 'updated_at' => now()->subHours(2)]);
    portalReqTicket($ws, $contact, ['subject' => 'Recent one', 'updated_at' => now()->subHour()]);

    $this->get('/help')->assertOk()->assertDontSee('Your recent requests');

    $this->actingAs($contact, 'contact');
    $res = $this->get('/help')->assertOk();
    $res->assertSee('Your recent requests');
    $res->assertSee('Recent one');
    $res->assertSee('Recent two');
    $res->assertSee('Recent three');
    $res->assertDontSee('Recent four oldest not shown');

    Workspace::forgetCurrent();
});
