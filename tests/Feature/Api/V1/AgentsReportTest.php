<?php

declare(strict_types=1);

use App\Models\Contact;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:string,1:Workspace,2:User} */
function agentsReportWorld(array $userAttrs = ['is_agent' => true]): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $userAttrs));
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws, $user];
}

function agentsReportAgent(Workspace $ws, string $name): User
{
    return User::factory()->for($ws, 'workspace')->create([
        'name' => $name, 'email' => 'a'.Str::uuid().'@x.com', 'is_agent' => true, 'email_verified_at' => now(),
    ]);
}

function agentsReportTicket(Workspace $ws, string $assigneeId, array $attrs): Ticket
{
    $contact = Contact::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'C', 'email' => 'c'.Str::uuid().'@x.com']);

    return Ticket::forceCreate(array_merge([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'requester_id' => $contact->id, 'assignee_id' => $assigneeId,
        'subject' => 'S', 'status' => 'open', 'priority' => 'high', 'channel' => 'email',
    ], $attrs));
}

function agentsReportUserMessage(Ticket $ticket, string $userId, Carbon $at, bool $internal = false): void
{
    DB::table('ticket_messages')->insert([
        'id' => (string) Str::uuid(), 'ticket_id' => $ticket->id, 'sender_type' => 'user', 'sender_user_id' => $userId,
        'body' => 'reply', 'is_internal' => $internal, 'channel' => 'email', 'created_at' => $at, 'updated_at' => $at,
    ]);
}

afterEach(fn () => Carbon::setTestNow());

it('aggregates per-agent assigned/solved counts sorted by solved desc', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC')); // window [Jul 18, Jul 25)
    [$token, $ws, $owner] = agentsReportWorld();
    $maya = agentsReportAgent($ws, 'Maya Chen');
    $inWin = Carbon::parse('2026-07-20 09:00:00', 'UTC');
    // owner: 1 assigned, 0 solved
    agentsReportTicket($ws, $owner->id, ['created_at' => $inWin]);
    // maya: 2 assigned, 2 solved
    agentsReportTicket($ws, $maya->id, ['created_at' => $inWin, 'status' => 'solved', 'resolved_at' => $inWin->copy()->addHours(2)]);
    agentsReportTicket($ws, $maya->id, ['created_at' => $inWin, 'status' => 'solved', 'resolved_at' => $inWin->copy()->addHours(3)]);

    $res = $this->withToken($token)->getJson('/v1/reports/agents?range=7d')->assertStatus(200);
    $agents = $res->json('data.agents');
    expect($agents)->toHaveCount(2);
    expect($agents[0]['name'])->toBe('Maya Chen'); // sorted by solved desc
    expect($agents[0]['assigned'])->toBe(2);
    expect($agents[0]['solved'])->toBe(2);
    expect($agents[1]['id'])->toBe($owner->id); // owner second (fewer solved)
    expect($agents[1]['solved'])->toBe(0);
    expect($agents[1]['assigned'])->toBe(1);

    Workspace::forgetCurrent();
});

it('computes per-agent wall-clock median first-reply and resolution minutes (odd/even/null)', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC'));
    [$token, $ws] = agentsReportWorld();
    $a = agentsReportAgent($ws, 'Alpha');
    $c = Carbon::parse('2026-07-22 09:00:00', 'UTC');
    // FRT durations 10,20,30 → median 20 ; resolution 60,120 → median 90
    agentsReportTicket($ws, $a->id, ['created_at' => $c, 'first_replied_at' => $c->copy()->addMinutes(10), 'resolved_at' => $c->copy()->addMinutes(60)]);
    agentsReportTicket($ws, $a->id, ['created_at' => $c, 'first_replied_at' => $c->copy()->addMinutes(20), 'resolved_at' => $c->copy()->addMinutes(120)]);
    agentsReportTicket($ws, $a->id, ['created_at' => $c, 'first_replied_at' => $c->copy()->addMinutes(30)]); // no resolve

    $res = $this->withToken($token)->getJson('/v1/reports/agents?range=7d')->assertStatus(200);
    $row = collect($res->json('data.agents'))->firstWhere('name', 'Alpha');
    expect($row['median_first_reply_minutes'])->toBe(20);
    expect($row['median_resolution_minutes'])->toBe(90);
});

it('computes per-agent CSAT positive rate and responses, null when unrated', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC'));
    [$token, $ws] = agentsReportWorld();
    $a = agentsReportAgent($ws, 'Rated');
    $b = agentsReportAgent($ws, 'Unrated');
    $when = Carbon::parse('2026-07-22 10:00:00', 'UTC');
    // Rated: 3 up, 1 down → 75%
    foreach (['thumbs_up', 'thumbs_up', 'thumbs_up', 'thumbs_down'] as $r) {
        agentsReportTicket($ws, $a->id, ['created_at' => $when, 'csat_rating' => $r, 'csat_responded_at' => $when]);
    }
    // Unrated agent: 1 assigned, no rating
    agentsReportTicket($ws, $b->id, ['created_at' => $when]);

    $res = $this->withToken($token)->getJson('/v1/reports/agents?range=7d')->assertStatus(200);
    $rated = collect($res->json('data.agents'))->firstWhere('name', 'Rated');
    $unrated = collect($res->json('data.agents'))->firstWhere('name', 'Unrated');
    expect($rated['csat_pct'])->toBe(75);
    expect($rated['csat_responses'])->toBe(4);
    expect($unrated['csat_pct'])->toBeNull();
    expect($unrated['csat_responses'])->toBe(0);
});

it('buckets replies per day counting only agent (user) messages, weekly for 90d', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC'));
    [$token, $ws] = agentsReportWorld();
    $a = agentsReportAgent($ws, 'Replier');
    $t = agentsReportTicket($ws, $a->id, ['created_at' => Carbon::parse('2026-07-24 09:00:00', 'UTC')]);
    agentsReportUserMessage($t, $a->id, Carbon::parse('2026-07-24 09:05:00', 'UTC'));          // public reply
    agentsReportUserMessage($t, $a->id, Carbon::parse('2026-07-24 09:30:00', 'UTC'), true);     // internal note
    // a contact message must NOT be counted
    DB::table('ticket_messages')->insert(['id' => (string) Str::uuid(), 'ticket_id' => $t->id, 'sender_type' => 'contact',
        'sender_contact_id' => $t->requester_id, 'body' => 'q', 'is_internal' => false, 'channel' => 'email',
        'created_at' => Carbon::parse('2026-07-24 08:00:00', 'UTC'), 'updated_at' => Carbon::parse('2026-07-24 08:00:00', 'UTC')]);

    $d7 = $this->withToken($token)->getJson('/v1/reports/agents?range=7d')->assertStatus(200);
    expect($d7->json('data.replies_per_day'))->toHaveCount(7);
    expect(collect($d7->json('data.replies_per_day'))->sum('count'))->toBe(2); // 2 user messages, contact excluded

    $d90 = $this->withToken($token)->getJson('/v1/reports/agents?range=90d')->assertStatus(200);
    expect($d90->json('data.replies_per_day'))->toHaveCount(13); // ceil(90/7)
});

it('returns the binary CSAT breakdown with responses and positive_pct', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC'));
    [$token, $ws] = agentsReportWorld();
    $a = agentsReportAgent($ws, 'A');
    $when = Carbon::parse('2026-07-22 10:00:00', 'UTC');
    foreach (['thumbs_up', 'thumbs_up', 'thumbs_up', 'thumbs_down'] as $r) {
        agentsReportTicket($ws, $a->id, ['csat_rating' => $r, 'csat_responded_at' => $when]);
    }

    $res = $this->withToken($token)->getJson('/v1/reports/agents?range=7d')->assertStatus(200);
    expect($res->json('data.csat.responses'))->toBe(4);
    expect($res->json('data.csat.positive_pct'))->toBe(75);
    $breakdown = $res->json('data.csat.breakdown');
    expect($breakdown)->toHaveCount(2);
    expect($breakdown[0]['key'])->toBe('positive');
    expect($breakdown[0]['count'])->toBe(3);
    expect($breakdown[0]['pct'])->toBe(75);
    expect($breakdown[1]['key'])->toBe('negative');
    expect($breakdown[1]['count'])->toBe(1);
    expect($breakdown[1]['pct'])->toBe(25);
});

it('isolates the agents report by workspace', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC'));
    [$token, $wsA] = agentsReportWorld();
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();
    $bAgent = agentsReportAgent($wsB, 'Other WS Agent');
    agentsReportTicket($wsB, $bAgent->id, ['created_at' => Carbon::parse('2026-07-20 09:00:00', 'UTC')]);
    $wsA->makeCurrent();

    $res = $this->withToken($token)->getJson('/v1/reports/agents?range=7d')->assertStatus(200);
    expect($res->json('data.agents'))->toHaveCount(0);

    Workspace::forgetCurrent();
});

it('forbids a non-agent (403)', function (): void {
    [$token] = agentsReportWorld(['is_agent' => false, 'admin_level' => 'owner']);
    $this->withToken($token)->getJson('/v1/reports/agents?range=7d')->assertStatus(403);
    Workspace::forgetCurrent();
});

it('rejects an invalid range (422)', function (): void {
    [$token] = agentsReportWorld();
    $this->withToken($token)->getJson('/v1/reports/agents?range=all')->assertStatus(422);
    Workspace::forgetCurrent();
});
