<?php

declare(strict_types=1);

use App\Models\Contact;
use App\Models\Issue;
use App\Models\Team;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:string,1:Workspace,2:User} */
function trackerToggleWorld(array $userAttrs = ['is_developer' => true], bool $trackerEnabled = true, bool $helpdeskEnabled = true): array
{
    $ws = Workspace::factory()->create(['tracker_enabled' => $trackerEnabled, 'helpdesk_enabled' => $helpdeskEnabled]);
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $userAttrs));
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws, $user];
}

afterEach(fn () => Workspace::forgetCurrent());

it('runs the tracker in a new workspace', function (): void {
    $ws = Workspace::factory()->create();

    expect($ws->fresh()->tracker_enabled)->toBeTrue();
});

// Control: without this, the 403s below would pass even if the switch did nothing.
it('serves the tracker to a developer while it is on', function (string $endpoint): void {
    [$token] = trackerToggleWorld();

    $this->withToken($token)->getJson($endpoint)->assertOk();
})->with(['/v1/issues', '/v1/projects', '/v1/me/todos', '/v1/notifications/unread-count']);

// One endpoint per area. TrackerRoutesTest proves every route carries the
// switch; this proves the switch closes what it sits on. The owner is the case
// that matters: Gate::before hands them every tracker policy, so only the switch
// in front of those policies can shut them out.
it('forbids every tracker area to the owner when the switch is off', function (string $endpoint): void {
    [$token] = trackerToggleWorld(['admin_level' => 'owner', 'is_developer' => true], trackerEnabled: false);

    $this->withToken($token)->getJson($endpoint)->assertForbidden();
})->with([
    '/v1/issues',
    '/v1/issues/lookup',
    '/v1/projects',
    '/v1/teams',
    '/v1/labels',
    '/v1/releases',
    '/v1/roadmap',
    '/v1/saved-views',
    '/v1/reports/tracker-overview',
    '/v1/reports/cycles',
    '/v1/me/todos',
    '/v1/me/plan',
    '/v1/notifications',
    '/v1/notifications/unread-count',
    '/v1/search?q=anything',
    '/v1/search/issues',
    '/v1/integrations/slack',
    '/v1/integrations/github',
]);

it('forbids writing to the tracker too when the switch is off', function (): void {
    [$token, $ws] = trackerToggleWorld(['admin_level' => 'owner', 'is_developer' => true], trackerEnabled: false);
    $team = Team::factory()->for($ws, 'workspace')->create();

    $this->withToken($token)->postJson('/v1/issues', ['title' => 'Not today', 'team_id' => $team->id])->assertForbidden();

    expect(Issue::query()->count())->toBe(0);
});

// The switch is scoped to the tracker: the support side and what both share stay.
it('leaves the support side and the shared endpoints reachable when the tracker is off', function (string $endpoint): void {
    [$token] = trackerToggleWorld(['admin_level' => 'owner', 'is_agent' => true], trackerEnabled: false);

    $this->withToken($token)->getJson($endpoint)->assertOk();
})->with([
    '/v1/me',
    '/v1/workspace',
    '/v1/members',
    '/v1/tickets',
    '/v1/kb/library',
    '/v1/reports/overview',
]);

it('serves the tracker pages while it is on', function (string $path): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);

    $this->get($path)->assertOk();
})->with(['/today', '/issues', '/settings/labels', '/notifications']);

// The pages answer 404, not 403: a workspace that doesn't run a tracker
// shouldn't advertise one it refuses to open — as with the support module.
it('hides the tracker pages when it is off', function (string $path): void {
    $ws = Workspace::factory()->create(['tracker_enabled' => false]);
    test()->actingInWorkspace($ws);

    $this->get($path)->assertNotFound();
})->with([
    '/today',
    '/issues',
    '/board',
    '/issues/'.'00000000-0000-0000-0000-000000000000',
    '/teams',
    '/projects',
    '/projects/00000000-0000-0000-0000-000000000000/chat',
    '/labels',
    '/roadmap',
    '/analytics',
    '/releases',
    '/notifications',
    '/settings/teams',
    '/settings/labels',
    '/settings/integrations',
    '/search',
    '/integrations',
    '/create',
]);

it('keeps the rest of the app reachable when the tracker is off', function (string $path): void {
    $ws = Workspace::factory()->create(['tracker_enabled' => false]);
    test()->actingInWorkspace($ws);

    $this->get($path)->assertOk();
})->with(['/', '/login', '/settings/general', '/settings/members', '/support', '/help']);

it('lets an owner switch the tracker off', function (): void {
    [$token, $ws] = trackerToggleWorld(['admin_level' => 'owner']);

    $this->withToken($token)->patchJson('/v1/workspace', ['tracker_enabled' => false])
        ->assertOk()
        ->assertJsonPath('data.tracker_enabled', false)
        ->assertJsonPath('data.helpdesk_enabled', true);

    expect($ws->fresh()->tracker_enabled)->toBeFalse();
});

it('lets an admin switch the tracker back on', function (): void {
    [$token, $ws] = trackerToggleWorld(['admin_level' => 'admin'], trackerEnabled: false);

    $this->withToken($token)->patchJson('/v1/workspace', ['tracker_enabled' => true])->assertOk();

    expect($ws->fresh()->tracker_enabled)->toBeTrue();
});

it('forbids anyone below admin from switching the tracker', function (string $level): void {
    [$token, $ws] = trackerToggleWorld(['admin_level' => $level, 'is_developer' => true, 'is_agent' => true]);

    $this->withToken($token)->patchJson('/v1/workspace', ['tracker_enabled' => false])->assertForbidden();

    expect($ws->fresh()->tracker_enabled)->toBeTrue();
})->with(['member', 'viewer']);

it('rejects a non-boolean tracker switch', function (mixed $value): void {
    [$token] = trackerToggleWorld(['admin_level' => 'owner']);

    $this->withToken($token)->patchJson('/v1/workspace', ['tracker_enabled' => $value])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['tracker_enabled']);
})->with([
    'a string' => ['nope'],
    'an array' => [['a']],
]);

// A workspace with neither module would have nothing left to open.
it('refuses to switch off the last module that is on', function (array $workspace, array $payload, string $field): void {
    [$token, $ws] = trackerToggleWorld(['admin_level' => 'owner'], ...$workspace);

    $this->withToken($token)->patchJson('/v1/workspace', $payload)
        ->assertStatus(422)
        ->assertJsonValidationErrors([$field]);

    $fresh = $ws->fresh();
    expect($fresh->tracker_enabled || $fresh->helpdesk_enabled)->toBeTrue();
})->with([
    'the tracker, with support already off' => [['helpdeskEnabled' => false], ['tracker_enabled' => false], 'tracker_enabled'],
    'support, with the tracker already off' => [['trackerEnabled' => false], ['helpdesk_enabled' => false], 'helpdesk_enabled'],
    'both at once' => [[], ['tracker_enabled' => false, 'helpdesk_enabled' => false], 'tracker_enabled'],
    'the tracker, sent as "0"' => [['helpdeskEnabled' => false], ['tracker_enabled' => '0'], 'tracker_enabled'],
]);

// Every other writer meets the same rule in the table.
it('refuses a workspace with both modules off at the database', function (): void {
    expect(fn () => Workspace::factory()->create(['tracker_enabled' => false, 'helpdesk_enabled' => false]))
        ->toThrow(QueryException::class);
});

// The SPA decides what to render from /v1/me; without the switch there it would
// keep offering a tracker that answers 403.
it('reports the switch on the authenticated user payload and the workspace', function (bool $enabled): void {
    [$token] = trackerToggleWorld(['is_agent' => true], trackerEnabled: $enabled);

    $this->withToken($token)->getJson('/v1/me')->assertOk()->assertJsonPath('data.workspace.tracker_enabled', $enabled);
    $this->withToken($token)->getJson('/v1/workspace')->assertOk()->assertJsonPath('data.tracker_enabled', $enabled);
})->with([true, false]);

// The bridge needs both sides. With the tracker off a ticket points at no issue:
// the desk would otherwise link to a page that answers 404.
it('drops the linked issues from tickets and the report when the tracker is off', function (): void {
    [$token, $ws, $agent] = trackerToggleWorld(['admin_level' => 'owner', 'is_agent' => true]);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $agent->id]);
    $contact = Contact::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Grace', 'email' => 'grace@northwind.com']);
    $ticket = Ticket::forceCreate([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'requester_id' => $contact->id,
        'subject' => 'Export is empty', 'status' => 'open', 'priority' => 'normal', 'channel' => 'email',
        // Inside the report's window: it compares at whole seconds, so a ticket made this second can miss "now".
        'created_at' => now()->subDay(),
    ]);
    DB::table('issue_ticket_links')->insert(['issue_id' => $issue->id, 'ticket_id' => $ticket->id, 'created_by' => $agent->id]);

    // Control: the link is there while the tracker runs.
    $this->withToken($token)->getJson("/v1/tickets/{$ticket->id}")->assertOk()
        ->assertJsonPath('data.linked_issues.0.id', $issue->id);
    $this->withToken($token)->getJson('/v1/reports/overview')->assertOk()
        ->assertJsonPath('data.escalations.count', 1)
        ->assertJsonPath('data.escalations.recent.0.issue_id', $issue->id);

    $ws->update(['tracker_enabled' => false]);

    $this->withToken($token)->getJson("/v1/tickets/{$ticket->id}")->assertOk()
        ->assertJsonPath('data.linked_issues', []);
    $this->withToken($token)->getJson('/v1/tickets')->assertOk()
        ->assertJsonPath('data.0.linked_issues', []);
    $this->withToken($token)->getJson('/v1/reports/overview')->assertOk()
        ->assertJsonPath('data.escalations.count', 0)
        ->assertJsonPath('data.escalations.recent', []);
});
