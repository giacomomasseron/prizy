<?php

declare(strict_types=1);

use App\Models\Contact;
use App\Models\SlaPolicy;
use App\Models\Ticket;
use App\Models\Workspace;
use App\Repositories\SlaBreachRepository;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

// Policy with no schedule → 24/7 fallback (due = created + minutes) for deterministic states.
function breachPolicy(Workspace $ws, int $firstReply = 60, int $resolution = 480): SlaPolicy
{
    return SlaPolicy::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Std',
        'first_reply_minutes' => $firstReply, 'resolution_minutes' => $resolution, 'schedule_id' => null]);
}

function breachTicket(Workspace $ws, string $policyId, array $attrs): Ticket
{
    $contact = Contact::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'C', 'email' => 'c'.Str::uuid().'@x.com']);

    return Ticket::forceCreate(array_merge([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'requester_id' => $contact->id, 'sla_policy_id' => $policyId,
        'subject' => 'S', 'status' => 'open', 'priority' => 'high', 'channel' => 'email',
    ], $attrs));
}

afterEach(fn () => Carbon::setTestNow());

it('records a first_reply breach for an overdue unreplied ticket', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-29 12:00:00', 'UTC'));
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $p = breachPolicy($ws, 60, 480);
    $t = breachTicket($ws, $p->id, ['created_at' => Carbon::parse('2026-07-29 10:00:00', 'UTC')]); // due 11:00, now 12:00 → breached
    Workspace::forgetCurrent();

    $written = app(SlaBreachRepository::class)->recordDueBreaches();

    expect($written)->toBeGreaterThanOrEqual(1);
    expect(DB::table('sla_breaches')->where(['ticket_id' => $t->id, 'metric' => 'first_reply'])->exists())->toBeTrue();
    $row = DB::table('sla_breaches')->where(['ticket_id' => $t->id, 'metric' => 'first_reply'])->first();
    expect(Carbon::parse($row->breached_at)->toIso8601String())->toBe('2026-07-29T11:00:00+00:00'); // = due_at
});

it('is idempotent — a second run writes nothing new', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-29 12:00:00', 'UTC'));
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $p = breachPolicy($ws);
    breachTicket($ws, $p->id, ['created_at' => Carbon::parse('2026-07-29 10:00:00', 'UTC')]);
    Workspace::forgetCurrent();

    app(SlaBreachRepository::class)->recordDueBreaches();
    $after1 = DB::table('sla_breaches')->count();
    $written2 = app(SlaBreachRepository::class)->recordDueBreaches();

    expect($written2)->toBe(0);
    expect(DB::table('sla_breaches')->count())->toBe($after1);
});

it('does not record a breach for a within-target or resolved ticket', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-29 12:00:00', 'UTC'));
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $p = breachPolicy($ws, 60, 480);
    breachTicket($ws, $p->id, ['created_at' => Carbon::parse('2026-07-29 11:40:00', 'UTC')]); // due 12:40 → still due, not breached
    breachTicket($ws, $p->id, ['created_at' => Carbon::parse('2026-07-29 08:00:00', 'UTC'), 'first_replied_at' => Carbon::parse('2026-07-29 08:05:00', 'UTC'), 'resolved_at' => Carbon::parse('2026-07-29 09:00:00', 'UTC')]); // resolved (skipped by the open-set query)
    Workspace::forgetCurrent();

    $written = app(SlaBreachRepository::class)->recordDueBreaches();

    expect($written)->toBe(0);
    expect(DB::table('sla_breaches')->count())->toBe(0);
});

it('records breaches across multiple workspaces', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-29 12:00:00', 'UTC'));
    $wsA = Workspace::factory()->create();
    $wsA->makeCurrent();
    breachTicket($wsA, breachPolicy($wsA)->id, ['created_at' => Carbon::parse('2026-07-29 10:00:00', 'UTC')]);
    Workspace::forgetCurrent();
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();
    breachTicket($wsB, breachPolicy($wsB)->id, ['created_at' => Carbon::parse('2026-07-29 10:00:00', 'UTC')]);
    Workspace::forgetCurrent();

    $written = app(SlaBreachRepository::class)->recordDueBreaches();

    expect($written)->toBeGreaterThanOrEqual(2);
    expect(DB::table('sla_breaches')->count())->toBeGreaterThanOrEqual(2);
});

it('does not record a next_reply breach — recurring metric is computed live, not stored', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-29 14:00:00', 'UTC'));
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $p = SlaPolicy::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Std',
        'first_reply_minutes' => 60, 'resolution_minutes' => 480, 'next_reply_minutes' => 120, 'schedule_id' => null]);
    $t = breachTicket($ws, $p->id, [
        'created_at' => Carbon::parse('2026-07-29 08:00:00', 'UTC'),
        'first_replied_at' => Carbon::parse('2026-07-29 08:05:00', 'UTC'),
    ]);
    // Pending customer message at 11:30 → next_reply due 13:30 (24/7); now 14:00 → overdue.
    DB::table('ticket_messages')->insert([
        'id' => (string) Str::uuid(), 'ticket_id' => $t->id, 'sender_type' => 'contact',
        'sender_contact_id' => $t->requester_id, 'body' => 'still broken', 'is_internal' => false,
        'channel' => 'email', 'created_at' => Carbon::parse('2026-07-29 11:30:00', 'UTC'), 'updated_at' => Carbon::parse('2026-07-29 11:30:00', 'UTC'),
    ]);
    Workspace::forgetCurrent();

    app(SlaBreachRepository::class)->recordDueBreaches();

    expect(DB::table('sla_breaches')->where(['ticket_id' => $t->id, 'metric' => 'next_reply'])->exists())->toBeFalse();
});

it('the sla:record-breaches command runs and exits 0', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-29 12:00:00', 'UTC'));
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    breachTicket($ws, breachPolicy($ws)->id, ['created_at' => Carbon::parse('2026-07-29 10:00:00', 'UTC')]);
    Workspace::forgetCurrent();

    $this->artisan('sla:record-breaches')->assertExitCode(0);
    expect(DB::table('sla_breaches')->count())->toBeGreaterThanOrEqual(1);
});
