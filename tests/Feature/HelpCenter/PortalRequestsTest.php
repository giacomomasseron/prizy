<?php

declare(strict_types=1);

use App\Models\Contact;
use App\Models\ContactMetadatum;
use App\Models\Issue;
use App\Models\KbArticle;
use App\Models\KbCategory;
use App\Models\KbSection;
use App\Models\Team;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use App\Models\Workspace;
use App\Notifications\CsatRequest;
use App\UseCases\Tokens\CreatePersonalAccessToken;
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

// portalPublishedArticle() is a global helper from PortalAuthTest.php (hoisted from
// this file and PortalSubmitTest.php's verbatim duplicate to avoid Pest's
// global-function redeclare fatal).

function portalDraftArticle(Workspace $ws, string $catSlug, string $secSlug, string $artSlug, string $title): void
{
    $cat = KbCategory::firstWhere('slug', $catSlug)
        ?? KbCategory::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Getting started', 'slug' => $catSlug]);
    $sec = KbSection::query()->where('category_id', $cat->id)->where('slug', $secSlug)->first()
        ?? KbSection::forceCreate(['id' => (string) Str::uuid(), 'category_id' => $cat->id, 'name' => ucfirst($secSlug), 'slug' => $secSlug]);
    KbArticle::forceCreate([
        'id' => (string) Str::uuid(), 'section_id' => $sec->id, 'author_id' => User::factory()->for($ws, 'workspace')->create()->id,
        'title' => $title, 'slug' => $artSlug, 'body' => 'Body.', 'status' => 'draft', 'published_at' => null,
    ]);
}

function portalEscalate(Workspace $ws, Ticket $ticket): void
{
    $team = Team::factory()->for($ws, 'workspace')->create();
    $agent = User::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $agent->id]);
    DB::table('issue_ticket_links')->insert([
        'issue_id' => $issue->id, 'ticket_id' => $ticket->id, 'created_by' => $agent->id,
    ]);
}

/** Verified agent + API token in the given workspace, for driving the agent-path /v1/tickets PATCH. */
function portalAgentToken(Workspace $ws): string
{
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_agent' => true]);

    return app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];
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

it('404s a non-uuid ticket id instead of 500ing', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);

    $this->actingAs($contact, 'contact');
    $this->get('/help/requests/not-a-uuid')->assertNotFound();

    Workspace::forgetCurrent();
});

it('treats a non-string filter query param as the default instead of 500ing', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    portalReqTicket($ws, $contact);

    $this->actingAs($contact, 'contact');
    $this->get('/help/requests?f[]=x')->assertOk()->assertSee('All (1)');

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

it('tie-breaks equal-timestamp conversation items with the event before the message', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    $at = now();
    $ticket = portalReqTicket($ws, $contact, ['created_at' => $at, 'updated_at' => $at]);
    portalReqMessage($ticket, ['from' => 'contact', 'body' => 'Opening message', 'at' => $at]);

    $this->actingAs($contact, 'contact');
    $res = $this->get("/help/requests/{$ticket->id}")->assertOk();
    $res->assertSeeInOrder(['Request received', 'Opening message']);

    Workspace::forgetCurrent();
});

it('shows the contact name and organization in the header when metadata is present', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    ContactMetadatum::forceCreate(['contact_id' => $contact->id, 'key' => 'organization', 'value' => 'Northwind Traders']);

    $this->actingAs($contact, 'contact');
    $this->get('/help/requests')->assertOk()
        ->assertSee('Grace Okonkwo')
        ->assertSee('Northwind Traders');

    Workspace::forgetCurrent();
});

it('omits the organization from the header when metadata is absent', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);

    $this->actingAs($contact, 'contact');
    $this->get('/help/requests')->assertOk()->assertSee('Grace Okonkwo');

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

it('rejects array reply body input with a redirect, not a 500', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    $ticket = portalReqTicket($ws, $contact);

    $this->actingAs($contact, 'contact');
    $this->post("/help/requests/{$ticket->id}/reply", ['body' => ['x']])
        ->assertStatus(302)
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

it('rates a solved own-ticket and back-fills csat_requested_at', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    // self-solved-style fixture: solved, resolved_at set, csat_requested_at NULL (the HC-2 gap).
    $ticket = portalReqTicket($ws, $contact, ['status' => 'solved', 'resolved_at' => now(), 'csat_requested_at' => null, 'csat_rating' => null]);

    $this->actingAs($contact, 'contact')->post("/help/requests/{$ticket->id}/rate", ['vote' => 'up'])
        ->assertRedirect(route('help.request', $ticket));

    $ticket->refresh();
    expect($ticket->csat_rating)->toBe('thumbs_up');
    expect($ticket->csat_responded_at)->not->toBeNull();
    expect($ticket->csat_requested_at)->not->toBeNull(); // back-filled

    Workspace::forgetCurrent();
});

it('re-rating flips the value but keeps the first csat_responded_at', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    $ticket = portalReqTicket($ws, $contact, ['status' => 'solved', 'resolved_at' => now(), 'csat_rating' => null]);

    $this->actingAs($contact, 'contact')->post("/help/requests/{$ticket->id}/rate", ['vote' => 'up'])->assertRedirect();
    $first = $ticket->refresh()->csat_responded_at;

    $this->travel(1)->minutes();
    $this->actingAs($contact, 'contact')->post("/help/requests/{$ticket->id}/rate", ['vote' => 'down'])->assertRedirect();
    $ticket->refresh();
    expect($ticket->csat_rating)->toBe('thumbs_down');
    expect($ticket->csat_responded_at->equalTo($first))->toBeTrue();

    $this->travelBack();
    Workspace::forgetCurrent();
});

it('403s rating a non-solved ticket', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    $ticket = portalReqTicket($ws, $contact, ['status' => 'open']);

    $this->actingAs($contact, 'contact')->post("/help/requests/{$ticket->id}/rate", ['vote' => 'up'])->assertStatus(403);
    expect($ticket->refresh()->csat_rating)->toBeNull();

    Workspace::forgetCurrent();
});

it('404s rating another contact\'s ticket', function (): void {
    $ws = portalWorld();
    $me = portalContact($ws, 'me@x.com');
    $other = portalContact($ws, 'other@x.com');
    $ticket = portalReqTicket($ws, $other, ['status' => 'solved', 'resolved_at' => now()]);

    $this->actingAs($me, 'contact')->post("/help/requests/{$ticket->id}/rate", ['vote' => 'up'])->assertNotFound();

    Workspace::forgetCurrent();
});

it('rejects a bad vote', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    $ticket = portalReqTicket($ws, $contact, ['status' => 'solved', 'resolved_at' => now(), 'csat_rating' => null]);

    $this->actingAs($contact, 'contact')->from(route('help.request', $ticket))
        ->post("/help/requests/{$ticket->id}/rate", ['vote' => 'sideways'])->assertSessionHasErrors('vote');
    expect($ticket->refresh()->csat_rating)->toBeNull();

    Workspace::forgetCurrent();
});

it('shows the CSAT prompt only when solved+unrated, and the confirmation once rated', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    $open = portalReqTicket($ws, $contact, ['status' => 'open']);
    $solved = portalReqTicket($ws, $contact, ['status' => 'solved', 'resolved_at' => now(), 'csat_rating' => null]);
    $rated = portalReqTicket($ws, $contact, ['status' => 'solved', 'resolved_at' => now(), 'csat_rating' => 'thumbs_up', 'csat_responded_at' => now()]);

    $this->actingAs($contact, 'contact')->get(route('help.request', $open))->assertDontSee('How did we do?');
    $this->actingAs($contact, 'contact')->get(route('help.request', $solved))->assertSee('How did we do?');
    $this->actingAs($contact, 'contact')->get(route('help.request', $rated))->assertDontSee('How did we do?')->assertSee('thanks');

    Workspace::forgetCurrent();
});

it('shows related articles matching the subject, published-only', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    $ticket = portalReqTicket($ws, $contact, ['subject' => 'CSV export timing out', 'status' => 'open']);
    portalPublishedArticle($ws, 'getting-started', 'basics', 'exporting-csv', 'Exporting to CSV', views: 10);
    // a draft that also matches must NOT appear
    portalDraftArticle($ws, 'getting-started', 'basics', 'draft-csv', 'Draft CSV export tips');

    $res = $this->actingAs($contact, 'contact')->get(route('help.request', $ticket))->assertOk();
    $res->assertSee('Exporting to CSV');
    $res->assertDontSee('Draft CSV export tips');

    Workspace::forgetCurrent();
});

it('shows the engineering escalation card when the ticket is linked to an issue', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    $linked = portalReqTicket($ws, $contact, ['status' => 'open']);
    $plain = portalReqTicket($ws, $contact, ['status' => 'open']);
    portalEscalate($ws, $linked); // creates an issue + issue_ticket_links row

    // "no action needed from you" is unique to the new sidebar card's copy — the
    // pre-existing (HC-2) derived timeline event text is "Escalated to our
    // engineering team", which would satisfy a plain 'engineering team' assertion
    // even if this card were removed, so it does not prove the card renders.
    $this->actingAs($contact, 'contact')->get(route('help.request', $linked))->assertSee('no action needed from you');
    $this->actingAs($contact, 'contact')->get(route('help.request', $plain))->assertDontSee('no action needed from you');

    Workspace::forgetCurrent();
});

it('403s before validating the vote on a non-solved own ticket, ordering the status gate before validation', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    $ticket = portalReqTicket($ws, $contact, ['status' => 'open']);

    $this->actingAs($contact, 'contact')->post("/help/requests/{$ticket->id}/rate", ['vote' => 'sideways'])->assertStatus(403);

    Workspace::forgetCurrent();
});

it('suppresses the later agent-path CSAT email after an inline rating, reopen, and re-resolve', function (): void {
    // Mirrors the final-review's P11 probe: the csat_requested_at back-fill in
    // RatePortalTicket is ChangeTicketStatus's send-once guard, so a rating
    // recorded in-portal must survive a reply-reopen and suppress the agent
    // path's email on the next resolve.
    Notification::fake();
    $ws = portalWorld();
    $contact = portalContact($ws);
    $token = portalAgentToken($ws);
    $ticket = portalReqTicket($ws, $contact, [
        'status' => 'solved', 'resolved_at' => now(), 'csat_requested_at' => null, 'csat_rating' => null,
    ]);

    $this->actingAs($contact, 'contact')
        ->post("/help/requests/{$ticket->id}/rate", ['vote' => 'up'])
        ->assertRedirect();
    expect($ticket->refresh()->csat_requested_at)->not->toBeNull();

    $this->actingAs($contact, 'contact')
        ->post("/help/requests/{$ticket->id}/reply", ['body' => 'Actually this broke again.'])
        ->assertRedirect();
    expect($ticket->refresh()->status)->toBe('open');
    expect($ticket->resolved_at)->toBeNull();

    $this->withToken($token)->patchJson("/v1/tickets/{$ticket->id}", ['status' => 'solved'])->assertOk();

    Notification::assertNothingSent();

    Workspace::forgetCurrent();
});

it('sends the agent-path CSAT email after reopen and re-resolve when there was no inline rating', function (): void {
    // The counterfactual half of P11/P12: identical flow minus the inline
    // rating step. Proves the observation itself works (the email IS sendable
    // through this exact reopen/re-resolve path) so the suppression test above
    // is evidence of the back-fill's effect, not of a broken assertion.
    Notification::fake();
    $ws = portalWorld();
    $contact = portalContact($ws);
    $token = portalAgentToken($ws);
    $ticket = portalReqTicket($ws, $contact, [
        'status' => 'solved', 'resolved_at' => now(), 'csat_requested_at' => null, 'csat_rating' => null,
    ]);

    $this->actingAs($contact, 'contact')
        ->post("/help/requests/{$ticket->id}/reply", ['body' => 'Actually this broke again.'])
        ->assertRedirect();
    expect($ticket->refresh()->status)->toBe('open');
    expect($ticket->resolved_at)->toBeNull();

    $this->withToken($token)->patchJson("/v1/tickets/{$ticket->id}", ['status' => 'solved'])->assertOk();

    Notification::assertSentOnDemand(CsatRequest::class);
    expect($ticket->refresh()->csat_requested_at)->not->toBeNull();

    Workspace::forgetCurrent();
});
