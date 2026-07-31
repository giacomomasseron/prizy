<?php

declare(strict_types=1);

use App\Models\Contact;
use App\Models\Issue;
use App\Models\Team;
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
function reportWorld(array $userAttrs = ['is_agent' => true]): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $userAttrs));
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws, $user];
}

function reportTicket(Workspace $ws, array $attrs): Ticket
{
    $contact = Contact::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'C', 'email' => 'c'.Str::uuid().'@x.com']);

    return Ticket::forceCreate(array_merge([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'requester_id' => $contact->id,
        'subject' => 'S', 'status' => 'open', 'priority' => 'high', 'channel' => 'email',
    ], $attrs));
}

afterEach(fn () => Carbon::setTestNow());

it('counts created and solved in the current window with a delta vs the previous window', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC')); // 7d window = [Jul 18, Jul 25)
    [$token, $ws] = reportWorld();
    // current window: 3 created, 2 solved
    reportTicket($ws, ['created_at' => Carbon::parse('2026-07-20 09:00:00', 'UTC')]);
    reportTicket($ws, ['created_at' => Carbon::parse('2026-07-21 09:00:00', 'UTC'), 'status' => 'solved', 'resolved_at' => Carbon::parse('2026-07-22 09:00:00', 'UTC')]);
    reportTicket($ws, ['created_at' => Carbon::parse('2026-07-23 09:00:00', 'UTC'), 'status' => 'solved', 'resolved_at' => Carbon::parse('2026-07-24 09:00:00', 'UTC')]);
    // previous window [Jul 11, Jul 18): 1 created
    reportTicket($ws, ['created_at' => Carbon::parse('2026-07-14 09:00:00', 'UTC')]);

    $res = $this->withToken($token)->getJson('/v1/reports/overview?range=7d')->assertStatus(200);
    expect($res->json('data.kpis.tickets_created.value'))->toBe(3);
    expect($res->json('data.kpis.tickets_created.delta_pct'))->toBe(200); // (3-1)/1
    expect($res->json('data.kpis.solved.value'))->toBe(2);
    expect($res->json('data.kpis.csat.value'))->toBeNull();

    Workspace::forgetCurrent();
});

it('returns a null delta when the previous window is empty', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC'));
    [$token, $ws] = reportWorld();
    reportTicket($ws, ['created_at' => Carbon::parse('2026-07-20 09:00:00', 'UTC')]);

    $res = $this->withToken($token)->getJson('/v1/reports/overview?range=7d')->assertStatus(200);
    expect($res->json('data.kpis.tickets_created.value'))->toBe(1);
    expect($res->json('data.kpis.tickets_created.delta_pct'))->toBeNull();

    Workspace::forgetCurrent();
});

it('computes the wall-clock median first-reply in minutes', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC'));
    [$token, $ws] = reportWorld();
    // FRT durations: 10, 20, 30 min → median 20
    foreach ([10, 20, 30] as $m) {
        $c = Carbon::parse('2026-07-22 09:00:00', 'UTC');
        reportTicket($ws, ['created_at' => $c, 'first_replied_at' => $c->copy()->addMinutes($m)]);
    }

    $res = $this->withToken($token)->getJson('/v1/reports/overview?range=7d')->assertStatus(200);
    expect($res->json('data.kpis.median_first_reply_minutes.value'))->toBe(20);

    Workspace::forgetCurrent();
});

it('averages the two middle values for an even median', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC'));
    [$token, $ws] = reportWorld();
    foreach ([10, 20, 30, 40] as $m) { // median (20+30)/2 = 25
        $c = Carbon::parse('2026-07-22 09:00:00', 'UTC');
        reportTicket($ws, ['created_at' => $c, 'first_replied_at' => $c->copy()->addMinutes($m)]);
    }

    $res = $this->withToken($token)->getJson('/v1/reports/overview?range=7d')->assertStatus(200);
    expect($res->json('data.kpis.median_first_reply_minutes.value'))->toBe(25);

    Workspace::forgetCurrent();
});

it('buckets volume daily for 7d and weekly for 90d', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC'));
    [$token, $ws] = reportWorld();
    reportTicket($ws, ['created_at' => Carbon::parse('2026-07-20 09:00:00', 'UTC')]);

    $d7 = $this->withToken($token)->getJson('/v1/reports/overview?range=7d')->assertStatus(200);
    expect($d7->json('data.volume'))->toHaveCount(7);
    expect(collect($d7->json('data.volume'))->sum('created'))->toBe(1);

    $d90 = $this->withToken($token)->getJson('/v1/reports/overview?range=90d')->assertStatus(200);
    expect($d90->json('data.volume'))->toHaveCount(13); // ceil(90/7)

    Workspace::forgetCurrent();
});

it('attributes volume buckets to calendar days, not a rolling time-of-day window', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-06-15 14:30:00', 'UTC')); // mid-day report instant
    [$token, $ws] = reportWorld();
    reportTicket($ws, ['created_at' => Carbon::parse('2026-06-15 09:00:00', 'UTC')]); // today, before "now" time-of-day
    reportTicket($ws, ['created_at' => Carbon::parse('2026-06-14 23:30:00', 'UTC')]); // yesterday, late

    $res = $this->withToken($token)->getJson('/v1/reports/overview?range=7d')->assertStatus(200);
    $volume = collect($res->json('data.volume'));
    expect($volume)->toHaveCount(7);

    $today = $volume->last();
    $yesterday = $volume->slice(-2, 1)->first();
    expect($today['label'])->toBe('Jun 15');
    expect($today['created'])->toBe(1);
    expect($yesterday['label'])->toBe('Jun 14');
    expect($yesterday['created'])->toBe(1);

    Workspace::forgetCurrent();
});

it('returns the current by-status snapshot', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC'));
    [$token, $ws] = reportWorld();
    reportTicket($ws, ['status' => 'open']);
    reportTicket($ws, ['status' => 'open']);
    reportTicket($ws, ['status' => 'solved', 'resolved_at' => now()]);

    $res = $this->withToken($token)->getJson('/v1/reports/overview?range=7d')->assertStatus(200);
    expect($res->json('data.by_status.open'))->toBe(2);
    expect($res->json('data.by_status.solved'))->toBe(1);
    expect($res->json('data.by_status.closed'))->toBe(0);

    Workspace::forgetCurrent();
});

it('counts escalations (created-in-window tickets with an issue link) with a rate and recent list', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC'));
    [$token, $ws, $user] = reportWorld();
    $team = Team::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'T', 'identifier' => 'TTT']);
    $issue = Issue::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'team_id' => $team->id, 'created_by' => $user->id, 'title' => 'I', 'status' => 'todo', 'priority' => 'no_priority']);
    $linked = reportTicket($ws, ['created_at' => Carbon::parse('2026-07-22 09:00:00', 'UTC'), 'subject' => 'Escalated one']);
    reportTicket($ws, ['created_at' => Carbon::parse('2026-07-22 09:00:00', 'UTC')]); // not escalated
    DB::table('issue_ticket_links')->insert(['issue_id' => $issue->id, 'ticket_id' => $linked->id, 'created_by' => $user->id]);

    $res = $this->withToken($token)->getJson('/v1/reports/overview?range=7d')->assertStatus(200);
    expect($res->json('data.escalations.count'))->toBe(1);
    expect($res->json('data.escalations.created_total'))->toBe(2);
    expect($res->json('data.escalations.rate_pct'))->toBe(50);
    expect($res->json('data.escalations.recent.0.ticket_id'))->toBe($linked->id);
    expect($res->json('data.escalations.recent.0.issue_id'))->toBe($issue->id);

    Workspace::forgetCurrent();
});

it('returns the earliest linked issue for an escalated ticket with multiple links', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC'));
    [$token, $ws, $user] = reportWorld();
    $team = Team::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'T', 'identifier' => 'TTT']);
    $mk = fn (string $title) => Issue::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'team_id' => $team->id, 'created_by' => $user->id, 'title' => $title, 'status' => 'todo', 'priority' => 'no_priority']);
    // Create the "Later"-linked issue row FIRST (so it is physically earlier in the
    // `issues` table, the join's driving side) while giving it the LATER pivot
    // created_at. An unordered join naturally returns rows in the driving table's
    // order, i.e. "Later" first — only an explicit ORDER BY on the pivot's
    // created_at correctly yields "Earlier" first.
    $later = $mk('Later');
    $earlier = $mk('Earlier');
    $ticket = reportTicket($ws, ['created_at' => Carbon::parse('2026-07-22 09:00:00', 'UTC')]);
    DB::table('issue_ticket_links')->insert([
        ['issue_id' => $later->id, 'ticket_id' => $ticket->id, 'created_by' => $user->id, 'created_at' => Carbon::parse('2026-07-23 10:00:00', 'UTC')],
        ['issue_id' => $earlier->id, 'ticket_id' => $ticket->id, 'created_by' => $user->id, 'created_at' => Carbon::parse('2026-07-22 10:00:00', 'UTC')],
    ]);

    $res = $this->withToken($token)->getJson('/v1/reports/overview?range=7d')->assertStatus(200);
    expect($res->json('data.escalations.count'))->toBe(1);
    expect($res->json('data.escalations.recent.0.issue_id'))->toBe($earlier->id);

    Workspace::forgetCurrent();
});

it('isolates the report by workspace', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC'));
    [$token, $wsA] = reportWorld();
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();
    reportTicket($wsB, ['created_at' => Carbon::parse('2026-07-20 09:00:00', 'UTC')]);
    $wsA->makeCurrent();

    $res = $this->withToken($token)->getJson('/v1/reports/overview?range=7d')->assertStatus(200);
    expect($res->json('data.kpis.tickets_created.value'))->toBe(0);

    Workspace::forgetCurrent();
});

it('forbids a non-agent (403)', function (): void {
    [$token, $ws] = reportWorld(['is_agent' => false, 'admin_level' => 'owner']);

    $this->withToken($token)->getJson('/v1/reports/overview?range=7d')->assertStatus(403);

    Workspace::forgetCurrent();
});

it('rejects an invalid range (422)', function (): void {
    [$token, $ws] = reportWorld();

    $this->withToken($token)->getJson('/v1/reports/overview?range=all')->assertStatus(422);

    Workspace::forgetCurrent();
});

it('reports the CSAT positive rate for the current window with a delta', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC')); // 7d window = [Jul 18, Jul 25)
    [$token, $ws] = reportWorld();
    // current window: 3 up, 1 down → 75%
    foreach (['thumbs_up', 'thumbs_up', 'thumbs_up', 'thumbs_down'] as $r) {
        reportTicket($ws, ['csat_rating' => $r, 'csat_responded_at' => Carbon::parse('2026-07-22 10:00:00', 'UTC')]);
    }
    // previous window [Jul 11, Jul 18): 1 up, 1 down → 50%
    foreach (['thumbs_up', 'thumbs_down'] as $r) {
        reportTicket($ws, ['csat_rating' => $r, 'csat_responded_at' => Carbon::parse('2026-07-14 10:00:00', 'UTC')]);
    }

    $res = $this->withToken($token)->getJson('/v1/reports/overview?range=7d')->assertStatus(200);
    expect($res->json('data.kpis.csat.value'))->toBe(75);
    expect($res->json('data.kpis.csat.delta_pct'))->toBe(50); // (75-50)/50

    Workspace::forgetCurrent();
});

it('returns a null CSAT value and delta when there are no ratings in the window', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC'));
    [$token, $ws] = reportWorld();
    reportTicket($ws, ['created_at' => Carbon::parse('2026-07-20 09:00:00', 'UTC')]); // no rating

    $res = $this->withToken($token)->getJson('/v1/reports/overview?range=7d')->assertStatus(200);
    expect($res->json('data.kpis.csat.value'))->toBeNull();
    expect($res->json('data.kpis.csat.delta_pct'))->toBeNull();

    Workspace::forgetCurrent();
});

it('returns per-bucket sparkline series aligned to the volume buckets', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC')); // 7d daily buckets Jul 19..Jul 25 (index 0..6)
    [$token, $ws] = reportWorld();

    reportTicket($ws, ['created_at' => Carbon::parse('2026-07-20 09:00:00', 'UTC')]); // created bucket 1

    // median first-reply on Jul 21 (bucket 2): FRT 10 & 30 → median 20
    foreach ([10, 30] as $m) {
        $c = Carbon::parse('2026-07-21 08:00:00', 'UTC');
        reportTicket($ws, ['created_at' => $c, 'first_replied_at' => $c->copy()->addMinutes($m)]);
    }

    // csat on Jul 22 (bucket 3): 2 up + 1 down → 67%
    reportTicket($ws, ['csat_responded_at' => Carbon::parse('2026-07-22 10:00:00', 'UTC'), 'csat_rating' => 'thumbs_up']);
    reportTicket($ws, ['csat_responded_at' => Carbon::parse('2026-07-22 11:00:00', 'UTC'), 'csat_rating' => 'thumbs_up']);
    reportTicket($ws, ['csat_responded_at' => Carbon::parse('2026-07-22 12:00:00', 'UTC'), 'csat_rating' => 'thumbs_down']);

    $res = $this->withToken($token)->getJson('/v1/reports/overview?range=7d')->assertStatus(200);
    $sp = $res->json('data.sparklines');
    $volumeLen = count($res->json('data.volume'));

    expect($sp)->toHaveKeys(['tickets_created', 'solved', 'median_first_reply_minutes', 'csat']);
    foreach ($sp as $series) {
        expect($series)->toHaveCount($volumeLen); // 7
    }
    expect($sp['tickets_created'])->toBe(collect($res->json('data.volume'))->pluck('created')->all());
    expect($sp['solved'])->toBe(collect($res->json('data.volume'))->pluck('solved')->all());
    expect($sp['median_first_reply_minutes'][2])->toBe(20);
    expect($sp['median_first_reply_minutes'][0])->toBeNull();
    expect($sp['csat'][3])->toBe(67);
    expect($sp['csat'][0])->toBeNull();

    Workspace::forgetCurrent();
});
