<?php

declare(strict_types=1);

use App\Models\Contact;
use App\Models\KbArticle;
use App\Models\KbCategory;
use App\Models\KbSection;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

// portalWorld() / portalContact() are global helpers from PortalAuthTest.php (HC-2).

function portalSubmitArticle(Workspace $ws, string $catSlug, string $secSlug, string $artSlug, string $title, int $views = 0): void
{
    $cat = KbCategory::firstWhere('slug', $catSlug)
        ?? KbCategory::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Getting started', 'slug' => $catSlug]);
    $sec = KbSection::query()->where('category_id', $cat->id)->where('slug', $secSlug)->first()
        ?? KbSection::forceCreate(['id' => (string) Str::uuid(), 'category_id' => $cat->id, 'name' => ucfirst($secSlug), 'slug' => $secSlug]);
    KbArticle::forceCreate([
        'id' => (string) Str::uuid(), 'section_id' => $sec->id, 'author_id' => User::factory()->for($ws, 'workspace')->create()->id,
        'title' => $title, 'slug' => $artSlug, 'body' => 'Body.', 'status' => 'published', 'published_at' => now()->subDay(), 'views_count' => $views,
    ]);
}

it('renders the submit form for a signed-in contact', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);

    $this->actingAs($contact, 'contact')->get('/help/new')->assertOk()
        ->assertSee('Submit a request')
        ->assertSee('Submit request');

    Workspace::forgetCurrent();
});

it('creates a portal ticket owned by the acting contact with an opening message', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);

    $res = $this->actingAs($contact, 'contact')->post('/help/new', [
        'subject' => 'Export keeps timing out',
        'priority' => 'high',
        'body' => 'Every CSV export over 10k rows times out at 30s.',
    ]);

    $ticket = Ticket::query()->where('subject', 'Export keeps timing out')->first();
    expect($ticket)->not->toBeNull();
    expect($ticket->requester_id)->toBe($contact->id);
    expect($ticket->status)->toBe('new');
    expect($ticket->channel)->toBe('portal');
    expect($ticket->priority)->toBe('high');
    expect($ticket->assignee_id)->toBeNull();
    $res->assertRedirect(route('help.request', $ticket));

    $msg = TicketMessage::query()->where('ticket_id', $ticket->id)->first();
    expect($msg->sender_type)->toBe('contact');
    expect($msg->sender_contact_id)->toBe($contact->id);
    expect($msg->is_internal)->toBeFalse();
    expect($msg->body)->toContain('CSV export');

    Workspace::forgetCurrent();
});

it('sets the requester to the session contact and cannot be spoofed', function (): void {
    $ws = portalWorld();
    $me = portalContact($ws, 'me@northwind.com');
    $other = portalContact($ws, 'other@northwind.com');

    // A malicious requester_id in the body is ignored — requester is the session contact.
    $this->actingAs($me, 'contact')->post('/help/new', [
        'subject' => 'Spoof attempt',
        'priority' => 'normal',
        'body' => 'trying to open a ticket as someone else',
        'requester_id' => $other->id,
    ])->assertRedirect();

    $ticket = Ticket::query()->where('subject', 'Spoof attempt')->first();
    expect($ticket->requester_id)->toBe($me->id);

    Workspace::forgetCurrent();
});

it('validates required fields and priority', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    $act = fn (array $data) => $this->actingAs($contact, 'contact')->from('/help/new')->post('/help/new', $data);

    $act(['subject' => '', 'priority' => 'high', 'body' => 'x'])->assertSessionHasErrors('subject');
    $act(['subject' => 's', 'priority' => 'high', 'body' => ''])->assertSessionHasErrors('body');
    $act(['subject' => 's', 'priority' => 'nope', 'body' => 'x'])->assertSessionHasErrors('priority');
    expect(Ticket::query()->where('subject', 's')->exists())->toBeFalse();

    Workspace::forgetCurrent();
});

it('redirects guests from the submit form to sign-in', function (): void {
    portalWorld();
    $this->get('/help/new')->assertRedirect('/help/login');
    $this->post('/help/new', ['subject' => 's', 'priority' => 'high', 'body' => 'x'])->assertRedirect('/help/login');
    Workspace::forgetCurrent();
});

it('shows self-help articles on the form', function (): void {
    $ws = portalWorld();
    $contact = portalContact($ws);
    portalSubmitArticle($ws, 'getting-started', 'basics', 'export-guide', 'Exporting your data', views: 500);

    $this->actingAs($contact, 'contact')->get('/help/new')->assertOk()
        ->assertSee('Exporting your data');

    Workspace::forgetCurrent();
});
