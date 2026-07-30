<?php

declare(strict_types=1);

use App\Models\Contact;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:string,1:Workspace} */
function ticketPageWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['is_agent' => true, 'email_verified_at' => now()]);

    return [app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'], $ws];
}

function ticketPageTicket(Workspace $ws, array $attrs): Ticket
{
    $contact = Contact::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'C', 'email' => 'c'.Str::uuid().'@x.com']);

    return Ticket::forceCreate(array_merge(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'requester_id' => $contact->id, 'subject' => 'S', 'status' => 'open', 'priority' => 'normal', 'channel' => 'email'], $attrs));
}

afterEach(fn () => Workspace::forgetCurrent());

it('cursor-paginates with a limit and an advancing after cursor', function (): void {
    [$token, $ws] = ticketPageWorld();
    foreach (range(1, 5) as $i) {
        ticketPageTicket($ws, ['subject' => "T{$i}", 'updated_at' => Carbon::parse('2026-07-01', 'UTC')->addMinutes($i)]);
    }
    $p1 = $this->withToken($token)->getJson('/v1/tickets?limit=2')->assertStatus(200);
    expect($p1->json('data'))->toHaveCount(2);
    expect($p1->json('links.next'))->not->toBeNull();
    $next = $p1->json('links.next');
    parse_str((string) parse_url($next, PHP_URL_QUERY), $q);
    $after = $q['after'] ?? '';
    $p2 = $this->withToken($token)->getJson('/v1/tickets?limit=2&after='.urlencode($after))->assertStatus(200);
    expect($p2->json('data'))->toHaveCount(2);
    // no overlap between page 1 and page 2
    $ids1 = collect($p1->json('data'))->pluck('id');
    $ids2 = collect($p2->json('data'))->pluck('id');
    expect($ids1->intersect($ids2))->toHaveCount(0);
});

it('sorts by priority (urgent first), created_at, and sla_due', function (): void {
    [$token, $ws] = ticketPageWorld();
    ticketPageTicket($ws, ['subject' => 'low', 'priority' => 'low']);
    ticketPageTicket($ws, ['subject' => 'urg', 'priority' => 'urgent']);
    $prio = $this->withToken($token)->getJson('/v1/tickets?sort=priority')->assertStatus(200);
    expect($prio->json('data.0.subject'))->toBe('urg');

    // sla_due: only tickets with first_reply_due_at, soonest first
    ticketPageTicket($ws, ['subject' => 'soon', 'first_reply_due_at' => Carbon::parse('2026-07-01 10:00', 'UTC')]);
    ticketPageTicket($ws, ['subject' => 'later', 'first_reply_due_at' => Carbon::parse('2026-07-01 12:00', 'UTC')]);
    $sla = $this->withToken($token)->getJson('/v1/tickets?sort=sla_due')->assertStatus(200);
    $subjects = collect($sla->json('data'))->pluck('subject');
    expect($subjects->first())->toBe('soon');
    expect($subjects->contains('low'))->toBeFalse(); // null due_at excluded from the sla_due view
});

it('keeps filters working under pagination+sort', function (): void {
    [$token, $ws] = ticketPageWorld();
    ticketPageTicket($ws, ['status' => 'open']);
    ticketPageTicket($ws, ['status' => 'solved', 'resolved_at' => now()]);
    $res = $this->withToken($token)->getJson('/v1/tickets?sort=created_at&filter[status]=open')->assertStatus(200);
    expect($res->json('data'))->toHaveCount(1);
    expect($res->json('data.0.status'))->toBe('open');
});

it('rejects an invalid sort or limit (422) and forbids a non-agent (403)', function (): void {
    [$token, $ws] = ticketPageWorld();
    $this->withToken($token)->getJson('/v1/tickets?sort=nope')->assertStatus(422);
    $this->withToken($token)->getJson('/v1/tickets?limit=999')->assertStatus(422);
    $na = User::factory()->for($ws, 'workspace')->create(['is_agent' => false, 'admin_level' => 'owner', 'email_verified_at' => now()]);
    $t = app(CreatePersonalAccessToken::class)->handle($na, 't', null)['token'];
    $this->withToken($t)->getJson('/v1/tickets')->assertStatus(403);
});
