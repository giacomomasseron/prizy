<?php

declare(strict_types=1);

use App\Models\Contact;
use App\Models\Workspace;
use App\Notifications\PortalLoginLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

function portalWorld(): Workspace
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    URL::forceRootUrl('http://'.$ws->slug.'.localhost');

    return $ws;
}

function portalContact(Workspace $ws, string $email = 'grace@northwind.com'): Contact
{
    return Contact::forceCreate([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id,
        'name' => 'Grace Okonkwo', 'email' => $email,
    ]);
}

/** Requests a link with Notification faked and returns the signed URL. */
function portalLoginUrl(Contact $contact): string
{
    $url = null;
    Notification::assertSentOnDemand(PortalLoginLink::class, function (PortalLoginLink $n) use (&$url): bool {
        $url = $n->url;

        return true;
    });

    return (string) $url;
}

it('renders the sign-in page', function (): void {
    portalWorld();
    $this->get('/help/login')->assertOk()
        ->assertSee('Sign in to view your requests')
        ->assertSee('Email me a sign-in link');
    Workspace::forgetCurrent();
});

it('responds identically for known and unknown emails (anti-enumeration)', function (): void {
    Notification::fake();
    $ws = portalWorld();
    portalContact($ws);

    $known = $this->post('/help/login', ['email' => 'grace@northwind.com']);
    $unknown = $this->post('/help/login', ['email' => 'nobody@nowhere.test']);

    foreach ([$known, $unknown] as $res) {
        $res->assertOk()->assertSee('If that address has requests with us, we&#039;ve emailed a sign-in link.', false);
    }
    Notification::assertSentOnDemandTimes(PortalLoginLink::class, 1); // only the real contact got mail

    Workspace::forgetCurrent();
});

it('rejects array email input with a redirect, not a 500', function (): void {
    Notification::fake();
    portalWorld();

    // `email[]=a` used to reach a bare (string) cast on an array — 500, and
    // it also punctured anti-enumeration by behaving unlike the sent-state.
    $this->post('/help/login', ['email' => ['a']])
        ->assertStatus(302)
        ->assertSessionHasErrors('email');

    Notification::assertNothingSent();

    Workspace::forgetCurrent();
});

it('logs the contact in via the emailed link, single-use, rotating the session', function (): void {
    Notification::fake();
    $ws = portalWorld();
    $contact = portalContact($ws);
    $this->post('/help/login', ['email' => $contact->email]);
    $url = portalLoginUrl($contact);

    // Warm up a session so we can verify the session ID rotates on login
    // (mirrors tests/Feature/Auth/MagicLinkTest.php's idiom).
    $this->get('/health');
    $preLoginSessionId = session()->getId();

    $this->get($url)->assertRedirect('/help/requests');
    expect(auth('contact')->id())->toBe($contact->id);
    expect(session()->getId())->not->toBe($preLoginSessionId);

    // Second use of the same link: nonce consumed → friendly expired page, not a login.
    auth('contact')->logout();
    $this->get($url)->assertStatus(403);

    Workspace::forgetCurrent();
});

it('rejects expired and tampered links with the friendly page', function (): void {
    Notification::fake();
    $ws = portalWorld();
    $contact = portalContact($ws);
    $this->post('/help/login', ['email' => $contact->email]);
    $url = portalLoginUrl($contact);

    $this->travel(16)->minutes();
    $this->get($url)->assertStatus(403);
    expect(auth('contact')->check())->toBeFalse();

    $this->travelBack();
    // nonce is a PATH segment (/help/login/consume/{nonce}/{contact}) —
    // prefixing it invalidates the signature over the path.
    $this->get(str_replace('/consume/', '/consume/x', $url))->assertStatus(403);

    Workspace::forgetCurrent();
});

it('cannot consume a link minted on another workspace host', function (): void {
    Notification::fake();
    $wsA = portalWorld();
    $contactA = portalContact($wsA);
    $this->post('/help/login', ['email' => $contactA->email]);
    $urlA = portalLoginUrl($contactA);

    Workspace::forgetCurrent();

    // Switch tenant context to workspace B for the remainder of the test.
    $wsB = Workspace::factory()->create();
    $this->actingInWorkspace($wsB);
    URL::forceRootUrl('http://'.$wsB->slug.'.localhost');

    // 1. Replay the literal A-minted URL while B is the current workspace.
    // The Contact lookup inside ConsumePortalLoginLink is workspace-scoped
    // (WorkspaceScope/RLS against Workspace::current()), so even though this
    // request reproduces A's exact signed URL, no contact is found under B.
    $this->get($urlA)->assertStatus(403);
    expect(auth('contact')->check())->toBeFalse();

    // 2. Belt-and-braces: construct the B-host equivalent by hand — a FRESH
    // nonce (the one above was already burned by step 1's Cache::pull)
    // mapped to the same A-only contact id, freshly signed under B's forced
    // root url so the signature is unquestionably valid for this request.
    // Cache::pull finds the mapping, but Contact::query()->find() is still
    // workspace-scoped to B, so no contact comes back.
    $nonce = Str::random(40);
    Cache::put("portal-magic:{$nonce}", $contactA->id, now()->addMinutes(15));
    $urlB = URL::temporarySignedRoute('help.login.consume', now()->addMinutes(15), [
        'nonce' => $nonce, 'contact' => $contactA->id,
    ]);

    $this->get($urlB)->assertStatus(403);
    expect(auth('contact')->check())->toBeFalse();

    Workspace::forgetCurrent();
});

it('redirects guests from portal routes to the sign-in page', function (): void {
    portalWorld();
    $this->get('/help/requests')->assertRedirect('/help/login');
    Workspace::forgetCurrent();
});

it('logs out', function (): void {
    Notification::fake();
    $ws = portalWorld();
    $contact = portalContact($ws);
    $this->post('/help/login', ['email' => $contact->email]);
    $this->get(portalLoginUrl($contact));
    expect(auth('contact')->check())->toBeTrue();

    $this->post('/help/logout')->assertRedirect('/help');
    expect(auth('contact')->check())->toBeFalse();

    Workspace::forgetCurrent();
});
