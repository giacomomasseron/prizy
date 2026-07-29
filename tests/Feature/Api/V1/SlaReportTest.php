<?php

declare(strict_types=1);

use App\Models\Contact;
use App\Models\SlaPolicy;
use App\Models\Tag;
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
function slaReportWorld(array $userAttrs = ['is_agent' => true]): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $userAttrs));
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws, $user];
}

// A policy with NO schedule → SlaCalculator 24/7 fallback (due = created + minutes).
function slaReportPolicy(Workspace $ws, string $name, int $minutes): SlaPolicy
{
    return SlaPolicy::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => $name,
        'first_reply_minutes' => $minutes, 'resolution_minutes' => 480, 'schedule_id' => null]);
}

function slaReportTicket(Workspace $ws, ?string $policyId, array $attrs): Ticket
{
    $contact = Contact::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Reqr', 'email' => 'c'.Str::uuid().'@x.com']);

    return Ticket::forceCreate(array_merge([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'requester_id' => $contact->id, 'sla_policy_id' => $policyId,
        'subject' => 'S', 'status' => 'open', 'priority' => 'high', 'channel' => 'email',
    ], $attrs));
}

afterEach(fn () => Carbon::setTestNow());

it('computes first-reply attainment over decided in-window policied tickets', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC')); // 7d window = [Jul 18, Jul 25)
    [$token, $ws] = slaReportWorld();
    $p = slaReportPolicy($ws, 'Std', 60);
    $c = Carbon::parse('2026-07-20 09:00:00', 'UTC');
    // met: replied within 60m
    slaReportTicket($ws, $p->id, ['created_at' => $c, 'first_replied_at' => $c->copy()->addMinutes(30)]);
    // breached: replied after 60m
    slaReportTicket($ws, $p->id, ['created_at' => $c, 'first_replied_at' => $c->copy()->addMinutes(90)]);
    // breached: unreplied, overdue (created in window, due long past)
    slaReportTicket($ws, $p->id, ['created_at' => $c]);
    // excluded 'due': recent unreplied (due in the future)
    slaReportTicket($ws, $p->id, ['created_at' => Carbon::parse('2026-07-25 11:50:00', 'UTC')]);
    // excluded 'none': no policy
    slaReportTicket($ws, null, ['created_at' => $c, 'first_replied_at' => $c->copy()->addMinutes(5)]);

    $res = $this->withToken($token)->getJson('/v1/reports/sla?range=7d')->assertStatus(200);
    expect($res->json('data.attainment_pct'))->toBe(33); // 1 met / 3 decided

    Workspace::forgetCurrent();
});

it('breaks attainment down by plan sorted by target ascending', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC'));
    [$token, $ws] = slaReportWorld();
    $slow = slaReportPolicy($ws, 'Slow', 480);
    $fast = slaReportPolicy($ws, 'Fast', 60);
    $c = Carbon::parse('2026-07-20 09:00:00', 'UTC');
    // Fast: 1 met, 1 breached → 50%
    slaReportTicket($ws, $fast->id, ['created_at' => $c, 'first_replied_at' => $c->copy()->addMinutes(30)]);
    slaReportTicket($ws, $fast->id, ['created_at' => $c, 'first_replied_at' => $c->copy()->addMinutes(90)]);
    // Slow: 1 met → 100%
    slaReportTicket($ws, $slow->id, ['created_at' => $c, 'first_replied_at' => $c->copy()->addMinutes(120)]);

    $res = $this->withToken($token)->getJson('/v1/reports/sla?range=7d')->assertStatus(200);
    $plans = $res->json('data.by_plan');
    expect($plans)->toHaveCount(2);
    expect($plans[0]['name'])->toBe('Fast'); // target 60 < 480 → first
    expect($plans[0]['target_minutes'])->toBe(60);
    expect($plans[0]['attainment_pct'])->toBe(50);
    expect($plans[0]['count'])->toBe(2);
    expect($plans[1]['name'])->toBe('Slow');
    expect($plans[1]['attainment_pct'])->toBe(100);

    Workspace::forgetCurrent();
});

it('counts in-window tickets by channel with a fixed 0-filled order', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC'));
    [$token, $ws] = slaReportWorld();
    $c = Carbon::parse('2026-07-20 09:00:00', 'UTC');
    slaReportTicket($ws, null, ['created_at' => $c, 'channel' => 'email']);
    slaReportTicket($ws, null, ['created_at' => $c, 'channel' => 'email']);
    slaReportTicket($ws, null, ['created_at' => $c, 'channel' => 'chat']);

    $res = $this->withToken($token)->getJson('/v1/reports/sla?range=7d')->assertStatus(200);
    $byChannel = collect($res->json('data.by_channel'));
    expect($byChannel->pluck('channel')->all())->toBe(['email', 'chat', 'portal', 'api']);
    expect($byChannel->firstWhere('channel', 'email')['count'])->toBe(2);
    expect($byChannel->firstWhere('channel', 'chat')['count'])->toBe(1);
    expect($byChannel->firstWhere('channel', 'portal')['count'])->toBe(0);

    Workspace::forgetCurrent();
});

it('lists open due tickets closest to target, excluding replied/resolved/no-policy', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC'));
    [$token, $ws] = slaReportWorld();
    $p = slaReportPolicy($ws, 'Std', 60);
    // due tickets: unreplied, recent → due_at = created+60m in the future; order by due_at asc
    $soon = slaReportTicket($ws, $p->id, ['created_at' => Carbon::parse('2026-07-25 11:50:00', 'UTC'), 'subject' => 'Soon']);   // due 12:50 → 50m left
    slaReportTicket($ws, $p->id, ['created_at' => Carbon::parse('2026-07-25 11:30:00', 'UTC'), 'subject' => 'Sooner']);        // due 12:30 → 30m left
    // excluded: replied
    slaReportTicket($ws, $p->id, ['created_at' => Carbon::parse('2026-07-25 11:55:00', 'UTC'), 'first_replied_at' => Carbon::parse('2026-07-25 11:58:00', 'UTC')]);
    // excluded: resolved
    slaReportTicket($ws, $p->id, ['created_at' => Carbon::parse('2026-07-25 11:40:00', 'UTC'), 'resolved_at' => now()]);
    // excluded: no policy
    slaReportTicket($ws, null, ['created_at' => Carbon::parse('2026-07-25 11:45:00', 'UTC')]);

    $res = $this->withToken($token)->getJson('/v1/reports/sla?range=7d')->assertStatus(200);
    $risk = $res->json('data.breach_risk');
    expect($risk)->toHaveCount(2);
    expect($risk[0]['subject'])->toBe('Sooner'); // due 12:30 is soonest
    expect($risk[1]['subject'])->toBe('Soon');
    expect($risk[1]['requester_name'])->toBe('Reqr');
    expect($risk[1]['target_minutes'])->toBe(60);
    expect($risk[1]['remaining_minutes'])->toBe(50); // 12:50 - 12:00
    expect($risk[1]['pct'])->toBe(83);               // round(50/60*100)

    Workspace::forgetCurrent();
});

it('returns the top tags by usage over the window', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC'));
    [$token, $ws] = slaReportWorld();
    $c = Carbon::parse('2026-07-20 09:00:00', 'UTC');
    $bug = Tag::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'bug', 'color' => '#1']);
    $sso = Tag::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'sso', 'color' => '#2']);
    $t1 = slaReportTicket($ws, null, ['created_at' => $c]);
    $t2 = slaReportTicket($ws, null, ['created_at' => $c]);
    DB::table('ticket_tags')->insert([
        ['ticket_id' => $t1->id, 'tag_id' => $bug->id],
        ['ticket_id' => $t2->id, 'tag_id' => $bug->id],
        ['ticket_id' => $t1->id, 'tag_id' => $sso->id],
    ]);

    $res = $this->withToken($token)->getJson('/v1/reports/sla?range=7d')->assertStatus(200);
    $tags = $res->json('data.tags');
    expect($tags[0])->toBe(['name' => 'bug', 'count' => 2]); // most used first
    expect(collect($tags)->firstWhere('name', 'sso')['count'])->toBe(1);

    Workspace::forgetCurrent();
});

it('isolates the sla report by workspace', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC'));
    [$token, $wsA] = slaReportWorld();
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();
    $pB = slaReportPolicy($wsB, 'B', 60);
    slaReportTicket($wsB, $pB->id, ['created_at' => Carbon::parse('2026-07-20 09:00:00', 'UTC'), 'first_replied_at' => Carbon::parse('2026-07-20 09:10:00', 'UTC')]);
    $wsA->makeCurrent();

    $res = $this->withToken($token)->getJson('/v1/reports/sla?range=7d')->assertStatus(200);
    expect($res->json('data.attainment_pct'))->toBeNull();
    expect($res->json('data.by_plan'))->toHaveCount(0);

    Workspace::forgetCurrent();
});

it('isolates tags and breach_risk across workspaces', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC'));
    [$token, $wsA] = slaReportWorld();
    $pA = slaReportPolicy($wsA, 'A', 60);
    $bugA = Tag::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $wsA->id, 'name' => 'bug', 'color' => '#1']);
    $taggedA = slaReportTicket($wsA, null, ['created_at' => Carbon::parse('2026-07-20 09:00:00', 'UTC')]);
    DB::table('ticket_tags')->insert(['ticket_id' => $taggedA->id, 'tag_id' => $bugA->id]);
    slaReportTicket($wsA, $pA->id, ['created_at' => Carbon::parse('2026-07-25 11:50:00', 'UTC'), 'subject' => 'DueA']);

    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();
    $pB = slaReportPolicy($wsB, 'B', 60);
    $bugB = Tag::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $wsB->id, 'name' => 'bug', 'color' => '#2']);
    $taggedB = slaReportTicket($wsB, null, ['created_at' => Carbon::parse('2026-07-20 09:00:00', 'UTC')]);
    DB::table('ticket_tags')->insert(['ticket_id' => $taggedB->id, 'tag_id' => $bugB->id]);
    slaReportTicket($wsB, $pB->id, ['created_at' => Carbon::parse('2026-07-25 11:50:00', 'UTC'), 'subject' => 'DueB']);
    $wsA->makeCurrent();

    $res = $this->withToken($token)->getJson('/v1/reports/sla?range=7d')->assertStatus(200);
    $tags = collect($res->json('data.tags'));
    expect($tags->firstWhere('name', 'bug')['count'])->toBe(1); // A's tagged ticket only, not A+B's 2

    $risk = $res->json('data.breach_risk');
    expect($risk)->toHaveCount(1);
    expect($risk[0]['subject'])->toBe('DueA');

    Workspace::forgetCurrent();
});

it('limits breach_risk to 5, ordered by soonest due', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-25 12:00:00', 'UTC'));
    [$token, $ws] = slaReportWorld();
    $p = slaReportPolicy($ws, 'Std', 60);
    $now = Carbon::parse('2026-07-25 12:00:00', 'UTC');
    // due_at = created + 60m; all unreplied/open/policied → all 'due'. Staggered so due_at differs.
    foreach ([10, 20, 30, 40, 50, 55] as $age) {
        slaReportTicket($ws, $p->id, ['created_at' => $now->copy()->subMinutes($age), 'subject' => "Age{$age}"]);
    }

    $res = $this->withToken($token)->getJson('/v1/reports/sla?range=7d')->assertStatus(200);
    $risk = $res->json('data.breach_risk');
    expect($risk)->toHaveCount(5);
    // Age10 (created most recently → latest due_at → most remaining) is the 6th, dropped.
    expect(collect($risk)->pluck('subject')->all())->toBe(['Age55', 'Age50', 'Age40', 'Age30', 'Age20']);
    expect(collect($risk)->pluck('remaining_minutes')->all())->toBe([5, 10, 20, 30, 40]);

    Workspace::forgetCurrent();
});

it('forbids a non-agent (403)', function (): void {
    [$token] = slaReportWorld(['is_agent' => false, 'admin_level' => 'owner']);
    $this->withToken($token)->getJson('/v1/reports/sla?range=7d')->assertStatus(403);
    Workspace::forgetCurrent();
});

it('rejects an invalid range (422)', function (): void {
    [$token] = slaReportWorld();
    $this->withToken($token)->getJson('/v1/reports/sla?range=all')->assertStatus(422);
    Workspace::forgetCurrent();
});
