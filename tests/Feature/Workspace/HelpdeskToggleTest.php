<?php

declare(strict_types=1);

use App\Models\Contact;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:string,1:Workspace,2:User} */
function toggleWorld(array $userAttrs = ['is_agent' => true], bool $helpdeskEnabled = true): array
{
    $ws = Workspace::factory()->create(['helpdesk_enabled' => $helpdeskEnabled]);
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $userAttrs));
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws, $user];
}

it('enables the helpdesk for a new workspace', function (): void {
    $ws = Workspace::factory()->create();

    expect($ws->fresh()->helpdesk_enabled)->toBeTrue();
});

// Control: without this, the 403 below would pass even if the switch did nothing.
it('serves a helpdesk endpoint to an agent while the helpdesk is on', function (): void {
    [$token] = toggleWorld();

    $this->withToken($token)->getJson('/v1/tickets')->assertStatus(200);

    Workspace::forgetCurrent();
});

it('forbids an agent from a helpdesk endpoint when the workspace has the helpdesk off', function (): void {
    [$token] = toggleWorld(helpdeskEnabled: false);

    $this->withToken($token)->getJson('/v1/tickets')->assertStatus(403);

    Workspace::forgetCurrent();
});

// One endpoint per agent-gated area. The guard is centralised, but this is what
// proves the sweep actually reached every corner of the module.
it('forbids every helpdesk area when the switch is off', function (string $endpoint): void {
    [$token] = toggleWorld(helpdeskEnabled: false);

    $this->withToken($token)->getJson($endpoint)->assertStatus(403);

    Workspace::forgetCurrent();
})->with([
    '/v1/tickets',
    '/v1/tickets/counts',
    '/v1/contacts',
    '/v1/kb/library',
    '/v1/sla-policies',
    '/v1/business-hours',
    '/v1/ticket-views',
    '/v1/report-views',
    '/v1/reports/overview',
    '/v1/reports/agents',
    '/v1/reports/sla',
]);

// The switch is scoped to the support module: the tracker is a separate axis.
it('leaves the tracker reachable when the helpdesk is off', function (string $endpoint): void {
    [$token] = toggleWorld(['is_agent' => true, 'is_developer' => true], helpdeskEnabled: false);

    $this->withToken($token)->getJson($endpoint)->assertStatus(200);

    Workspace::forgetCurrent();
})->with([
    '/v1/issues',
    '/v1/projects',
    '/v1/reports/tracker-overview',
    '/v1/saved-views',
]);

// Customer-facing surfaces answer 404, not 403: a workspace that doesn't run a
// help desk shouldn't advertise one it refuses to open.
it('serves the customer-facing surfaces while the helpdesk is on', function (string $path): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);

    $this->get($path)->assertOk();

    Workspace::forgetCurrent();
})->with(['/help', '/help/login', '/support', '/settings/business-hours']);

it('hides the customer-facing and desk surfaces when the helpdesk is off', function (string $path): void {
    $ws = Workspace::factory()->create(['helpdesk_enabled' => false]);
    test()->actingInWorkspace($ws);

    $this->get($path)->assertNotFound();

    Workspace::forgetCurrent();
})->with([
    '/help',
    '/help/search?q=anything',
    '/help/login',
    '/help/requests',
    '/support',
    '/support/kb',
    '/settings/business-hours',
    '/settings/sla-policies',
]);

it('lets an owner switch the helpdesk off', function (): void {
    [$token, $ws] = toggleWorld(['admin_level' => 'owner']);

    $this->withToken($token)->patchJson('/v1/workspace', ['helpdesk_enabled' => false])
        ->assertOk()
        ->assertJsonPath('data.helpdesk_enabled', false);

    expect($ws->fresh()->helpdesk_enabled)->toBeFalse();

    Workspace::forgetCurrent();
});

it('lets an admin switch the helpdesk back on', function (): void {
    [$token, $ws] = toggleWorld(['admin_level' => 'admin'], helpdeskEnabled: false);

    $this->withToken($token)->patchJson('/v1/workspace', ['helpdesk_enabled' => true])->assertOk();

    expect($ws->fresh()->helpdesk_enabled)->toBeTrue();

    Workspace::forgetCurrent();
});

it('forbids anyone below admin from switching the helpdesk', function (string $level, bool $isAgent): void {
    [$token, $ws] = toggleWorld(['admin_level' => $level, 'is_agent' => $isAgent, 'is_developer' => true]);

    $this->withToken($token)->patchJson('/v1/workspace', ['helpdesk_enabled' => false])->assertStatus(403);

    expect($ws->fresh()->helpdesk_enabled)->toBeTrue();

    Workspace::forgetCurrent();
})->with([
    'a member who works the desk' => ['member', true],
    'a viewer' => ['viewer', false],
]);

it('rejects a missing or non-boolean switch', function (mixed $payload): void {
    [$token] = toggleWorld(['admin_level' => 'owner']);

    $this->withToken($token)->patchJson('/v1/workspace', $payload)->assertStatus(422);

    Workspace::forgetCurrent();
})->with([
    'nothing' => [[]],
    'a string' => [['helpdesk_enabled' => 'nope']],
    'an array' => [['helpdesk_enabled' => ['a']]],
]);

// The SPA decides what to render from /v1/me; without the switch there it would
// keep offering a desk that answers 403.
it('reports the switch on the authenticated user payload', function (bool $enabled): void {
    [$token] = toggleWorld(helpdeskEnabled: $enabled);

    $this->withToken($token)->getJson('/v1/me')
        ->assertOk()
        ->assertJsonPath('data.workspace.helpdesk_enabled', $enabled);

    Workspace::forgetCurrent();
})->with([true, false]);

// Gate::before hands an owner every policy check inside their own workspace, so
// the owner is exactly the role a module switch could fail to close. The gate
// that actually runs on the request path has no such bypass — pin it.
it('forbids an OWNER who is an agent when the switch is off', function (): void {
    [$token] = toggleWorld(['admin_level' => 'owner', 'is_agent' => true], helpdeskEnabled: false);

    $this->withToken($token)->getJson('/v1/tickets')->assertStatus(403);
    $this->withToken($token)->getJson('/v1/kb/library')->assertStatus(403);

    Workspace::forgetCurrent();
});

// Every portal page 404s, so a signed-in contact would otherwise have no way to
// end a session they can still be holding when the switch is flipped.
it('still lets a signed-in contact log out of the portal when the helpdesk is off', function (): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $contact = Contact::forceCreate([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id,
        'name' => 'Grace', 'email' => 'grace@northwind.com',
    ]);
    $this->actingAs($contact, 'contact');

    $ws->update(['helpdesk_enabled' => false]);

    $this->post('/help/logout')->assertRedirect();
    expect(Auth::guard('contact')->check())->toBeFalse();

    Workspace::forgetCurrent();
});
