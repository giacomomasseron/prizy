<?php

declare(strict_types=1);

use App\Models\Contact;
use App\Models\Workspace;
use App\Notifications\PortalLoginLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
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

it('logs the contact in via the emailed link, single-use', function (): void {
    Notification::fake();
    $ws = portalWorld();
    $contact = portalContact($ws);
    $this->post('/help/login', ['email' => $contact->email]);
    $url = portalLoginUrl($contact);

    $this->get($url)->assertRedirect('/help/requests');
    expect(auth('contact')->id())->toBe($contact->id);

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
