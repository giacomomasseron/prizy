<?php

declare(strict_types=1);

use App\Models\Contact;
use App\Models\Issue;
use App\Models\Team;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{token:string, issue:Issue, ticket:Ticket} */
function escalatedIssueWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id]);

    // Requester (customer) + org/plan metadata. contact_metadata has a composite
    // (contact_id, key) PK — no `id` column — so insert via the query builder,
    // mirroring ContactEndpointTest/TicketEndpointTest/SmokeSeeder.
    $contact = Contact::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Acme Corp', 'email' => 'c'.Str::uuid().'@x.com']);
    foreach (['organization' => 'Acme Corp', 'plan' => 'Business'] as $k => $v) {
        DB::table('contact_metadata')->insert(['contact_id' => $contact->id, 'key' => $k, 'value' => $v]);
    }
    $ticket = Ticket::forceCreate([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'requester_id' => $contact->id,
        'subject' => 'Attachments missing after escalating', 'status' => 'open', 'priority' => 'high', 'channel' => 'email',
    ]);
    DB::table('issue_ticket_links')->insert(['issue_id' => $issue->id, 'ticket_id' => $ticket->id, 'created_by' => $user->id]);

    $token = app(CreatePersonalAccessToken::class)->run($user, 't', null)['token'];

    return ['token' => $token, 'issue' => $issue, 'ticket' => $ticket];
}

afterEach(fn () => Workspace::forgetCurrent());

it('exposes support_ticket on the escalated issue show response', function (): void {
    ['token' => $token, 'issue' => $issue, 'ticket' => $ticket] = escalatedIssueWorld();

    $res = $this->withToken($token)->getJson("/v1/issues/{$issue->id}")->assertStatus(200);
    $res->assertJsonPath('data.support_ticket.subject', 'Attachments missing after escalating');
    $res->assertJsonPath('data.support_ticket.customer', 'Acme Corp');
    $res->assertJsonPath('data.support_ticket.plan', 'Business');
    $res->assertJsonPath('data.support_ticket.id', $ticket->id);
    expect($res->json('data.support_ticket.ref'))->toBe('TKT-'.strtoupper(substr($ticket->id, 0, 6)));
});

it('returns null support_ticket for a non-escalated issue', function (): void {
    ['token' => $token] = escalatedIssueWorld();
    $ws = Workspace::current();
    $plain = Issue::factory()->for($ws, 'workspace')->create(['team_id' => Team::factory()->for($ws, 'workspace')->create()->id]);

    $this->withToken($token)->getJson("/v1/issues/{$plain->id}")->assertStatus(200)
        ->assertJsonPath('data.support_ticket', null);
});

it('drops the support bridge from the issue payload when the helpdesk is off', function (): void {
    ['token' => $token, 'issue' => $issue] = escalatedIssueWorld();
    Workspace::current()->update(['helpdesk_enabled' => false]);

    // The card links to /support/tickets/{id}, which a switched-off workspace 404s,
    // so serving it would leave a dead link in the tracker.
    $this->withToken($token)->getJson("/v1/issues/{$issue->id}")
        ->assertOk()
        ->assertJsonPath('data.support_ticket', null);

    Workspace::forgetCurrent();
});

it('carries the ticket on the issue list too, where rows and cards show its reference', function (): void {
    ['token' => $token, 'issue' => $issue, 'ticket' => $ticket] = escalatedIssueWorld();
    $ws = Workspace::current();
    $plain = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $issue->team_id]);

    $rows = collect($this->withToken($token)->getJson('/v1/issues')->assertOk()->json('data'))->keyBy('id');

    expect($rows[$issue->id]['support_ticket']['ref'])->toBe('TKT-'.strtoupper(substr($ticket->id, 0, 6)));
    expect($rows[$issue->id]['support_ticket']['customer'])->toBe('Acme Corp');
    expect($rows[$plain->id]['support_ticket'])->toBeNull();
});

it('lists only the issues that came from Support with filter[escalated]=true', function (): void {
    ['token' => $token, 'issue' => $issue] = escalatedIssueWorld();
    $ws = Workspace::current();
    Issue::factory()->for($ws, 'workspace')->count(2)->create(['team_id' => $issue->team_id]);
    $issue->refresh(); // the factory leaves the status to the database

    expect($this->withToken($token)->getJson('/v1/issues')->assertOk()->json('data'))->toHaveCount(3);
    expect($this->withToken($token)->getJson('/v1/issues?filter[escalated]=true')->assertOk()->json('data.*.id'))->toBe([$issue->id]);
    // With another filter, both apply.
    expect($this->withToken($token)->getJson("/v1/issues?filter[escalated]=true&filter[status]={$issue->status}")->assertOk()->json('data.*.id'))->toBe([$issue->id]);
    expect($this->withToken($token)->getJson('/v1/issues?filter[escalated]=true&filter[status]=cancelled')->assertOk()->json('data'))->toBe([]);
});

it('accepts no other value for filter[escalated]', function (): void {
    ['token' => $token] = escalatedIssueWorld();

    $this->withToken($token)->getJson('/v1/issues?filter[escalated]=false')->assertStatus(422);
});

it('drops the ticket from the issue list when the helpdesk is off', function (): void {
    ['token' => $token, 'issue' => $issue] = escalatedIssueWorld();
    Workspace::current()->update(['helpdesk_enabled' => false]);

    $rows = collect($this->withToken($token)->getJson('/v1/issues')->assertOk()->json('data'))->keyBy('id');

    expect($rows[$issue->id]['support_ticket'])->toBeNull();
});

it('reads an empty filter value as no filter, not as an error', function (): void {
    ['token' => $token] = escalatedIssueWorld();

    expect($this->withToken($token)->getJson('/v1/issues?filter[status]=')->assertOk()->json('data'))->toHaveCount(1);
});
