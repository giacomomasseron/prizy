<?php

declare(strict_types=1);

use App\Models\Contact;
use App\Models\Ticket;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/**
 * Workspace + tenant host + forced URL root so signed URLs generated in tests
 * carry the tenant host (signatures cover the host; NeedsTenant resolves it).
 */
function csatWorld(): Workspace
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    URL::forceRootUrl('http://'.$ws->slug.'.localhost');

    return $ws;
}

function csatTicket(Workspace $ws, array $attrs = [], string $email = 'grace@northwind.com'): Ticket
{
    $contact = Contact::forceCreate([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id,
        'name' => 'Grace Okonkwo', 'email' => $email,
    ]);

    return Ticket::forceCreate(array_merge([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id,
        'requester_id' => $contact->id, 'subject' => 'Blank profile on escalation',
        'status' => 'solved', 'priority' => 'normal', 'channel' => 'email',
        'resolved_at' => now(),
    ], $attrs));
}

function csatUrl(Ticket $ticket, string $rating, ?DateTimeInterface $expires = null): string
{
    return URL::temporarySignedRoute(
        'csat.respond',
        $expires ?? now()->addDays(14),
        ['ticket' => $ticket->id, 'rating' => $rating],
    );
}

it('records a thumbs_up from a valid signed link and stamps csat_responded_at', function (): void {
    $ws = csatWorld();
    $ticket = csatTicket($ws);

    $this->get(csatUrl($ticket, 'up'))
        ->assertOk()
        ->assertViewIs('csat.thanks');

    $ticket->refresh();
    expect($ticket->csat_rating)->toBe('thumbs_up');
    expect($ticket->csat_responded_at)->not->toBeNull();

    Workspace::forgetCurrent();
});

it('lets a re-click change the rating while keeping the first csat_responded_at', function (): void {
    Carbon::setTestNow('2026-09-08 12:00:00');
    $ws = csatWorld();
    $ticket = csatTicket($ws);

    $this->get(csatUrl($ticket, 'up'))->assertOk();
    $first = $ticket->refresh()->csat_responded_at;

    Carbon::setTestNow('2026-09-08 12:30:00');
    $this->get(csatUrl($ticket, 'down'))->assertOk()->assertViewIs('csat.thanks');

    $ticket->refresh();
    expect($ticket->csat_rating)->toBe('thumbs_down');
    expect($ticket->csat_responded_at->equalTo($first))->toBeTrue();

    Carbon::setTestNow();
    Workspace::forgetCurrent();
});

it('shows the expired page with 403 for an expired signature', function (): void {
    $ws = csatWorld();
    $ticket = csatTicket($ws);
    $url = csatUrl($ticket, 'up');

    $this->travel(15)->days();

    $this->get($url)->assertStatus(403)->assertViewIs('csat.expired');
    expect($ticket->refresh()->csat_rating)->toBeNull();

    Workspace::forgetCurrent();
});

it('rejects a tampered rating param with 403', function (): void {
    $ws = csatWorld();
    $ticket = csatTicket($ws);

    $tampered = str_replace('/up?', '/down?', csatUrl($ticket, 'up'));

    $this->get($tampered)->assertStatus(403)->assertViewIs('csat.expired');
    expect($ticket->refresh()->csat_rating)->toBeNull();

    Workspace::forgetCurrent();
});

it('rejects a signed URL replayed against another workspace host with 403', function (): void {
    $ws = csatWorld();
    $ticket = csatTicket($ws);
    $other = Workspace::factory()->create();

    $replayed = str_replace($ws->slug.'.localhost', $other->slug.'.localhost', csatUrl($ticket, 'up'));

    $this->get($replayed)->assertStatus(403);
    expect($ticket->refresh()->csat_rating)->toBeNull();

    Workspace::forgetCurrent();
});

it('404s a validly signed URL whose ticket has been deleted', function (): void {
    $ws = csatWorld();
    $ticket = csatTicket($ws);
    $url = csatUrl($ticket, 'up');

    $ticket->delete();

    $this->get($url)->assertNotFound();

    Workspace::forgetCurrent();
});

it('404s an unknown rating value via the route constraint', function (): void {
    $ws = csatWorld();
    $ticket = csatTicket($ws);

    $this->get("/csat/{$ticket->id}/sideways")->assertNotFound();

    Workspace::forgetCurrent();
});
