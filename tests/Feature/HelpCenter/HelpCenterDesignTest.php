<?php

declare(strict_types=1);

use App\Models\ContactMetadatum;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

// The Help Center as its mockup draws it (public/Help Center.dc.html). The portal* helpers are global, from
// PortalAuthTest.php and PortalRequestsTest.php.

afterEach(fn () => Workspace::forgetCurrent());

it('names the workspace beside a "help" tag, and offers Submit a request to everyone', function (): void {
    $ws = portalWorld();

    $guest = $this->get('/help')->assertOk();
    $guest->assertSee('<span class="hc-brand__name">'.e($ws->name).'</span>', false);
    $guest->assertSee('<span class="hc-brand__tag">help</span>', false);
    $guest->assertSee('hc-header__submit', false);
    $guest->assertSee(route('help.new'), false);
    // The form itself still asks a guest to sign in first.
    $this->get('/help/new')->assertRedirect();
});

it('shows the signed-in contact as an avatar with their initials, name and organisation', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    ContactMetadatum::forceCreate(['contact_id' => $contact->id, 'key' => 'organization', 'value' => 'Northwind Traders']);
    $this->actingAs($contact, 'contact');

    $res = $this->get('/help')->assertOk();
    $res->assertSee('<span class="hc-avatar hc-avatar--me hc-avatar--md" aria-hidden="true">GO</span>', false);
    $res->assertSee('<span class="hc-account__name">Grace Okonkwo</span>', false);
    $res->assertSee('<span class="hc-account__org">Northwind Traders</span>', false);
});

it('greets a signed-in contact by first name, and a guest without one', function (): void {
    $ws = portalWorld();

    $this->get('/help')->assertOk()
        ->assertSee('<span class="hl">How can we help?</span>', false)
        ->assertDontSee('How can we help,');

    $this->actingAs(portalContact($ws), 'contact');
    $this->get('/help')->assertOk()
        ->assertSee('How can we help, <span class="hl">Grace</span>?', false);
});

it('lists the popular articles under the topics, with their topic and the number of articles in all', function (): void {
    $ws = portalWorld();
    portalPublishedArticle($ws, 'getting-started', 'basics', 'first-steps', 'First steps', 9);
    portalPublishedArticle($ws, 'getting-started', 'basics', 'second-steps', 'Second steps', 3);
    portalDraftArticle($ws, 'getting-started', 'basics', 'not-yet', 'Not published yet');

    $res = $this->get('/help')->assertOk();
    $res->assertSeeInOrder(['Browse by topic', '2 articles', 'Popular articles', 'First steps', 'Second steps']);
    $res->assertSee('<span class="hc-row__sub">Getting started</span>', false);
    $res->assertDontSee('Not published yet');
    // In English nothing is "English only".
    $res->assertDontSee('hc-chip--outline', false);
});

it('marks the popular articles that have no translation as English only when read in another language', function (): void {
    $ws = portalWorld();
    portalPublishedArticle($ws, 'getting-started', 'basics', 'first-steps', 'First steps', 9);

    $this->get('/help?lang=fr')->assertOk()
        ->assertSee('<span class="hc-chip hc-chip--outline">English only</span>', false);
});

it('shows no Popular articles section while nothing is published', function (): void {
    portalWorld();

    $this->get('/help')->assertOk()->assertDontSee('Popular articles');
});

it('shows each recent request with its status, id and a New reply chip, and links to all of them', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    $agent = User::factory()->for($ws, 'workspace')->create(['name' => 'Maya Chen', 'is_agent' => true]);
    $answered = portalReqTicket($ws, $contact, ['subject' => 'Answered request', 'status' => 'pending', 'updated_at' => now()->subHour()]);
    portalReqMessage($answered, ['from' => 'agent', 'user' => $agent, 'body' => 'Any news?']);
    portalReqTicket($ws, $contact, ['subject' => 'Quiet request', 'status' => 'solved', 'updated_at' => now()->subHours(2)]);
    foreach (range(1, 2) as $i) {
        portalReqTicket($ws, $contact, ['subject' => "Older request {$i}", 'updated_at' => now()->subDays($i)]);
    }
    $this->actingAs($contact, 'contact');

    $res = $this->get('/help')->assertOk();
    $res->assertSeeInOrder(['Your recent requests', 'View all 4', 'Answered request', 'Quiet request']);
    $res->assertSee('Awaiting you');
    $res->assertSee('Solved');
    $res->assertSee('#'.substr($answered->id, 0, 8));
    expect(substr_count($res->getContent(), 'New reply'))->toBe(1);
});

it('lays My requests out as a table with who handles each request, and a way to start a new one', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    $agent = User::factory()->for($ws, 'workspace')->create(['name' => 'Maya Chen', 'is_agent' => true]);
    portalReqTicket($ws, $contact, ['subject' => 'Assigned request', 'assignee_id' => $agent->id]);
    portalReqTicket($ws, $contact, ['subject' => 'Unassigned request']);
    $this->actingAs($contact, 'contact');

    $res = $this->get('/help/requests')->assertOk();
    $res->assertSee('Everything you have sent us.');
    $res->assertSeeInOrder(['Status', 'Subject', 'Handled by', 'Last activity']);
    $res->assertSee('<span class="hc-avatar hc-avatar--agent hc-avatar--sm" aria-hidden="true">MC</span>', false);
    $res->assertSee('Maya Chen');
    $res->assertSee('<span class="hc-avatar hc-avatar--none hc-avatar--sm" aria-hidden="true">·</span>', false);
    $res->assertSee('Awaiting assignment');
    $res->assertSee('New request');
    $res->assertDontSee('Try another filter');

    $this->get('/help/requests?q=nothing-like-this')->assertOk()
        ->assertSee('No requests match')
        ->assertSee('Try another filter, or start a new request.');
});

it('shows your own messages as "You" with your organisation, and a reply from support under the workspace\'s name', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    ContactMetadatum::forceCreate(['contact_id' => $contact->id, 'key' => 'organization', 'value' => 'Northwind Traders']);
    $agent = User::factory()->for($ws, 'workspace')->create(['name' => 'Maya Chen', 'is_agent' => true]);
    $ticket = portalReqTicket($ws, $contact, ['subject' => 'Two voices', 'assignee_id' => $agent->id]);
    portalReqMessage($ticket, ['body' => 'My question', 'at' => now()->subMinutes(10)]);
    portalReqMessage($ticket, ['from' => 'agent', 'user' => $agent, 'body' => 'Our answer', 'at' => now()->subMinutes(5)]);
    $this->actingAs($contact, 'contact');

    $res = $this->get("/help/requests/{$ticket->id}")->assertOk();
    $res->assertSeeInOrder([
        'hc-message--mine', '<span class="hc-message__name">You</span>', '<span class="hc-chip hc-chip--quiet">Northwind Traders</span>', 'My question',
        'hc-message--agent', '<span class="hc-message__name">Maya Chen</span>', '<span class="hc-chip hc-chip--sup">'.e($ws->name).' Support</span>', 'Our answer',
    ], false);
    // The reply box speaks to whoever handles the request, and the side card shows them.
    $res->assertSee('placeholder="Add a reply for Maya…"', false);
    $res->assertSee('<span class="hc-avatar hc-avatar--agent hc-avatar--lg" aria-hidden="true">MC</span>', false);
    $res->assertDontSee('Replying will reopen this request.');
});

it('addresses the reply to "our team" while nobody handles the request', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    $ticket = portalReqTicket($ws, $contact, ['subject' => 'Nobody yet']);
    $this->actingAs($contact, 'contact');

    $this->get("/help/requests/{$ticket->id}")->assertOk()
        ->assertSee('placeholder="Add a reply for our team…"', false)
        ->assertSee('Awaiting assignment');
});

it('says a reply reopens a solved request, and asks for a rating with plain Good and Bad buttons', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    $ticket = portalReqTicket($ws, $contact, ['subject' => 'All done', 'status' => 'solved', 'resolved_at' => now()]);
    $this->actingAs($contact, 'contact');

    $res = $this->get("/help/requests/{$ticket->id}")->assertOk();
    $res->assertSee('Replying will reopen this request.');
    $res->assertSee('placeholder="Reply here to reopen this request…"', false);
    $res->assertSee('class="hc-btn hc-btn--good">Good</button>', false);
    $res->assertSee('class="hc-btn hc-btn--bad">Bad</button>', false);
    $res->assertDontSee('👍');
});

it('gives the submit form a way back, hints in its fields, and a Cancel that goes home', function (): void {
    $ws = portalWorld();
    $this->actingAs(portalContact($ws), 'contact');

    $res = $this->get('/help/new')->assertOk();
    $res->assertSee('‹ Help center');
    $res->assertSee('placeholder="A one-line summary"', false);
    $res->assertSee('placeholder="What you expected, what happened instead, and the steps to reproduce it."', false);
    $res->assertSee('<a href="'.route('help.home').'" class="hc-btn hc-btn--quiet">Cancel</a>', false);
    // A request starts at Normal: the mockup's High would raise every request's SLA target.
    $res->assertSee('<option value="normal" selected', false);
});

it('says which topic an article belongs to beside its date', function (): void {
    $ws = portalWorld();
    portalPublishedArticle($ws, 'getting-started', 'basics', 'first-steps', 'First steps');

    $this->get('/help/getting-started/basics/first-steps')->assertOk()
        ->assertSee('Getting started · updated '.now()->format('M j, Y'));
});

it('links support staff to the agent desk from the footer', function (): void {
    portalWorld();

    $this->get('/help')->assertOk()->assertSee('<a href="/support" class="hc-footer__agent">Agent view', false);
});
