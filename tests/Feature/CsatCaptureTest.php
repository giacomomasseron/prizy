<?php

declare(strict_types=1);

use App\Models\Contact;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Workspace;
use App\Notifications\CsatRequest;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
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

/** Verified agent + API token in the given workspace. */
function csatAgent(Workspace $ws): string
{
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_agent' => true]);

    return app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];
}

it('emails the requester two signed rating links on first resolve and stamps csat_requested_at', function (): void {
    Notification::fake();
    $ws = csatWorld();
    $token = csatAgent($ws);
    $ticket = csatTicket($ws, ['status' => 'open', 'resolved_at' => null]);

    $this->withToken($token)->patchJson("/v1/tickets/{$ticket->id}", ['status' => 'solved'])->assertOk();

    Notification::assertSentOnDemand(CsatRequest::class, function (CsatRequest $n, array $channels, object $notifiable) use ($ticket): bool {
        expect($notifiable->routes['mail'])->toBe('grace@northwind.com');
        expect($n->ticketSubject)->toBe($ticket->subject);
        expect($n->upUrl)->toContain("/csat/{$ticket->id}/up")->toContain('signature=');
        expect($n->downUrl)->toContain("/csat/{$ticket->id}/down")->toContain('signature=');

        return true;
    });
    expect($ticket->refresh()->csat_requested_at)->not->toBeNull();

    Workspace::forgetCurrent();
});

it('does not re-send after a reopen and re-resolve', function (): void {
    Notification::fake();
    $ws = csatWorld();
    $token = csatAgent($ws);
    $ticket = csatTicket($ws, ['status' => 'open', 'resolved_at' => null]);

    $this->withToken($token)->patchJson("/v1/tickets/{$ticket->id}", ['status' => 'solved'])->assertOk();
    $this->withToken($token)->patchJson("/v1/tickets/{$ticket->id}", ['status' => 'open'])->assertOk();
    $this->withToken($token)->patchJson("/v1/tickets/{$ticket->id}", ['status' => 'solved'])->assertOk();

    Notification::assertSentOnDemandTimes(CsatRequest::class, 1);

    Workspace::forgetCurrent();
});

it('does not send for a ticket whose request was already sent', function (): void {
    Notification::fake();
    $ws = csatWorld();
    $token = csatAgent($ws);
    $ticket = csatTicket($ws, ['status' => 'open', 'resolved_at' => null, 'csat_requested_at' => now()->subDay()]);

    $this->withToken($token)->patchJson("/v1/tickets/{$ticket->id}", ['status' => 'solved'])->assertOk();

    Notification::assertNothingSent();

    Workspace::forgetCurrent();
});

it('skips the email but still resolves when the requester has no email', function (): void {
    Notification::fake();
    $ws = csatWorld();
    $token = csatAgent($ws);
    $ticket = csatTicket($ws, ['status' => 'open', 'resolved_at' => null], email: '');

    $this->withToken($token)->patchJson("/v1/tickets/{$ticket->id}", ['status' => 'solved'])->assertOk();

    Notification::assertNothingSent();
    $ticket->refresh();
    expect($ticket->resolved_at)->not->toBeNull();
    expect($ticket->csat_requested_at)->toBeNull();

    Workspace::forgetCurrent();
});

it('full loop: emailed link records the rating and the overview CSAT KPI reflects it', function (): void {
    // Time is pinned and stepped forward between phases (same idiom as the
    // re-click test above and OverviewReportTest) rather than left on the
    // real wall clock: ReportRepository::csatRate() compares csat_responded_at
    // against a live now(), and Laravel truncates DateTime query bindings to
    // whole-second precision (Grammar::getDateFormat() = 'Y-m-d H:i:s'), same
    // as the value already gets on save. A real end-to-end round trip here
    // (PATCH + signed-link GET + report GET) reliably completes in well under
    // a second, so an unpinned clock lands the write and the read in the same
    // truncated second and the strict "<" boundary spuriously excludes the
    // row — a pre-existing precision quirk of that unrelated, already-shipped
    // repository, not of the CSAT code under test here.
    Carbon::setTestNow('2026-09-08 12:00:00');
    Notification::fake();
    $ws = csatWorld();
    $token = csatAgent($ws);
    $ticket = csatTicket($ws, ['status' => 'open', 'resolved_at' => null]);

    $this->withToken($token)->patchJson("/v1/tickets/{$ticket->id}", ['status' => 'solved'])->assertOk();

    $upUrl = null;
    Notification::assertSentOnDemand(CsatRequest::class, function (CsatRequest $n) use (&$upUrl): bool {
        $upUrl = $n->upUrl;

        return true;
    });

    Carbon::setTestNow('2026-09-08 12:05:00');
    $this->get($upUrl)->assertOk()->assertViewIs('csat.thanks');
    expect($ticket->refresh()->csat_rating)->toBe('thumbs_up');

    Carbon::setTestNow('2026-09-08 12:10:00');
    $res = $this->withToken($token)->getJson('/v1/reports/overview?range=7d')->assertOk();
    expect($res->json('data.kpis.csat.value'))->toBe(100);

    Carbon::setTestNow();
    Workspace::forgetCurrent();
});

it('exposes csat_rating on the ticket payload', function (): void {
    $ws = csatWorld();
    $token = csatAgent($ws);
    $ticket = csatTicket($ws, ['csat_rating' => 'thumbs_up', 'csat_responded_at' => now()]);

    $res = $this->withToken($token)->getJson("/v1/tickets/{$ticket->id}")->assertOk();
    expect($res->json('data.csat_rating'))->toBe('thumbs_up');

    Workspace::forgetCurrent();
});
