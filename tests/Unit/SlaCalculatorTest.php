<?php

declare(strict_types=1);

use App\Models\BusinessHourInterval;
use App\Models\BusinessHourSchedule;
use App\Models\SlaBreach;
use App\Models\SlaPolicy;
use App\Models\Ticket;
use App\Services\SlaCalculator;
use Carbon\Carbon;
use Illuminate\Database\ConnectionResolverInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

// This is a true unit test: no Laravel app is booted, so Eloquent has no
// database connection resolver. Ticket::created_at / first_replied_at are
// cast to 'datetime', and assigning them directly (see ticketWith() below)
// makes Eloquent call getConnection()->getQueryGrammar()->getDateFormat() to
// format the value — which otherwise fatals with "Call to a member function
// connection() on null". Register a minimal resolver that only ever needs to
// answer that one formatting question; it is never asked to run a query.
if (Model::getConnectionResolver() === null) {
    Model::setConnectionResolver(new class implements ConnectionResolverInterface
    {
        public function connection($name = null): object
        {
            return new class
            {
                public function getQueryGrammar(): object
                {
                    return new class
                    {
                        public function getDateFormat(): string
                        {
                            return 'Y-m-d H:i:s';
                        }
                    };
                }
            };
        }

        public function getDefaultConnection(): string
        {
            return 'pgsql';
        }

        public function setDefaultConnection($name): void {}
    });
}

/** @param array<int, array{0:int,1:string,2:string}> $intervals [day_of_week, opens, closes] */
function schedule(array $intervals, string $tz = 'UTC'): BusinessHourSchedule
{
    $s = new BusinessHourSchedule(['name' => 'Std', 'timezone' => $tz]);
    $s->setRelation('businessHourIntervals', new Collection(array_map(
        fn ($i) => new BusinessHourInterval(['day_of_week' => $i[0], 'opens_at' => $i[1], 'closes_at' => $i[2]]),
        $intervals,
    )));

    return $s;
}

// Mon–Fri 09:00–17:00 (day_of_week 1..5)
function weekdays9to5(string $tz = 'UTC'): BusinessHourSchedule
{
    return schedule(array_map(fn ($d) => [$d, '09:00:00', '17:00:00'], [1, 2, 3, 4, 5]), $tz);
}

afterEach(fn () => Carbon::setTestNow());

it('adds minutes within a single interval', function (): void {
    // Wed 2026-07-29 10:00 UTC + 60 business min → 11:00 UTC
    $due = SlaCalculator::dueAt(Carbon::parse('2026-07-29 10:00:00', 'UTC'), 60, weekdays9to5());
    expect($due->toIso8601String())->toBe('2026-07-29T11:00:00+00:00');
});

it('spills into the next business day when the interval runs out', function (): void {
    // Wed 16:30 + 60 min → 30 min today (16:30–17:00), 30 min next day from 09:00 → Thu 09:30
    $due = SlaCalculator::dueAt(Carbon::parse('2026-07-29 16:30:00', 'UTC'), 60, weekdays9to5());
    expect($due->toIso8601String())->toBe('2026-07-30T09:30:00+00:00');
});

it('counts from opening time when the start is before hours', function (): void {
    // Wed 06:00 (before 09:00) + 60 → from 09:00 → 10:00
    $due = SlaCalculator::dueAt(Carbon::parse('2026-07-29 06:00:00', 'UTC'), 60, weekdays9to5());
    expect($due->toIso8601String())->toBe('2026-07-29T10:00:00+00:00');
});

it('moves to the next business day when the start is after hours', function (): void {
    // Wed 18:00 (after 17:00) + 60 → Thu 09:00–10:00 → 10:00
    $due = SlaCalculator::dueAt(Carbon::parse('2026-07-29 18:00:00', 'UTC'), 60, weekdays9to5());
    expect($due->toIso8601String())->toBe('2026-07-30T10:00:00+00:00');
});

it('skips weekend days with no intervals', function (): void {
    // Fri 16:30 + 60 → 30 min Fri (16:30–17:00), Sat/Sun skipped, 30 min Mon from 09:00 → Mon 09:30
    // 2026-07-31 is a Friday; next Mon is 2026-08-03.
    $due = SlaCalculator::dueAt(Carbon::parse('2026-07-31 16:30:00', 'UTC'), 60, weekdays9to5());
    expect($due->toIso8601String())->toBe('2026-08-03T09:30:00+00:00');
});

it('honours a lunch gap (multiple intervals in a day)', function (): void {
    // Wed 09:00–12:00 and 13:00–17:00. Start 11:30 + 60 → 30 min (11:30–12:00), then 30 min from 13:00 → 13:30
    $s = schedule([[3, '09:00:00', '12:00:00'], [3, '13:00:00', '17:00:00']]);
    $due = SlaCalculator::dueAt(Carbon::parse('2026-07-29 11:30:00', 'UTC'), 60, $s);
    expect($due->toIso8601String())->toBe('2026-07-29T13:30:00+00:00');
});

it('computes in the schedule timezone and returns UTC', function (): void {
    // Schedule in America/New_York 09:00–17:00. Start Wed 13:00 UTC = 09:00 EDT (-04:00) + 60 → 10:00 EDT = 14:00 UTC
    $due = SlaCalculator::dueAt(Carbon::parse('2026-07-29 13:00:00', 'UTC'), 60, weekdays9to5('America/New_York'));
    expect($due->toIso8601String())->toBe('2026-07-29T14:00:00+00:00');
});

it('falls back to 24/7 when there is no schedule', function (): void {
    $due = SlaCalculator::dueAt(Carbon::parse('2026-07-31 18:00:00', 'UTC'), 120, null);
    expect($due->toIso8601String())->toBe('2026-07-31T20:00:00+00:00');
});

// ---- firstReplyStatus ----

function ticketWith(?SlaPolicy $policy, ?string $createdAt, ?string $repliedAt = null, array $breachMetrics = []): Ticket
{
    $t = new Ticket;
    $t->created_at = $createdAt ? Carbon::parse($createdAt, 'UTC') : null;
    $t->first_replied_at = $repliedAt ? Carbon::parse($repliedAt, 'UTC') : null;
    $t->setRelation('slaPolicy', $policy);
    $t->setRelation('slaBreaches', new Collection(array_map(
        fn ($m) => new SlaBreach(['metric' => $m]),
        $breachMetrics,
    )));

    return $t;
}

function policy60(): SlaPolicy
{
    $p = new SlaPolicy(['name' => 'Standard SLA', 'first_reply_minutes' => 60]);
    $p->setRelation('schedule', weekdays9to5());

    return $p;
}

it('returns state none when the ticket has no policy', function (): void {
    $s = SlaCalculator::firstReplyStatus(ticketWith(null, '2026-07-29 10:00:00'));
    expect($s['state'])->toBe('none');
    expect($s['due_at'])->toBeNull();
    expect($s['policy_name'])->toBeNull();
});

it('returns met when replied before the deadline', function (): void {
    // created Wed 10:00, target 60 → due 11:00; replied 10:30 → met
    $s = SlaCalculator::firstReplyStatus(ticketWith(policy60(), '2026-07-29 10:00:00', '2026-07-29 10:30:00'));
    expect($s['state'])->toBe('met');
    expect($s['target_minutes'])->toBe(60);
});

it('returns breached when replied after the deadline', function (): void {
    // created Wed 10:00 → due 11:00; replied 11:30 → breached
    $s = SlaCalculator::firstReplyStatus(ticketWith(policy60(), '2026-07-29 10:00:00', '2026-07-29 11:30:00'));
    expect($s['state'])->toBe('breached');
});

it('returns due when unreplied and now is before the deadline', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-29 10:40:00', 'UTC')); // due 11:00
    $s = SlaCalculator::firstReplyStatus(ticketWith(policy60(), '2026-07-29 10:00:00'));
    expect($s['state'])->toBe('due');
    expect($s['due_at']->toIso8601String())->toBe('2026-07-29T11:00:00+00:00');
});

it('returns breached when unreplied and now is past the deadline', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-29 11:30:00', 'UTC')); // due 11:00
    $s = SlaCalculator::firstReplyStatus(ticketWith(policy60(), '2026-07-29 10:00:00'));
    expect($s['state'])->toBe('breached');
});

it('returns breached when a first_reply breach row exists even if before due', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-29 10:40:00', 'UTC')); // before due 11:00
    $s = SlaCalculator::firstReplyStatus(ticketWith(policy60(), '2026-07-29 10:00:00', null, ['first_reply']));
    expect($s['state'])->toBe('breached');
});

// ---- HD-6a: multi-metric engine ----

function policyMetrics(int $firstReply, int $resolution, ?int $nextReply = null, ?BusinessHourSchedule $sched = null): SlaPolicy
{
    $p = new SlaPolicy([
        'name' => 'Tiered SLA', 'first_reply_minutes' => $firstReply,
        'resolution_minutes' => $resolution, 'next_reply_minutes' => $nextReply,
    ]);
    $p->setRelation('schedule', $sched); // null → 24/7 fallback

    return $p;
}

/** @param array<int,string> $breachMetrics */
function metricsTicket(SlaPolicy $policy, string $createdAt, ?string $repliedAt = null, ?string $resolvedAt = null, ?App\Models\TicketMessage $latestPublic = null, array $breachMetrics = []): Ticket
{
    $t = new Ticket;
    $t->created_at = Carbon::parse($createdAt, 'UTC');
    $t->first_replied_at = $repliedAt ? Carbon::parse($repliedAt, 'UTC') : null;
    $t->resolved_at = $resolvedAt ? Carbon::parse($resolvedAt, 'UTC') : null;
    $t->setRelation('slaPolicy', $policy);
    $t->setRelation('latestPublicMessage', $latestPublic);
    $t->setRelation('slaBreaches', new Collection(array_map(fn ($m) => new SlaBreach(['metric' => $m]), $breachMetrics)));

    return $t;
}

function contactMessage(string $at): App\Models\TicketMessage
{
    $m = new App\Models\TicketMessage(['sender_type' => 'contact', 'is_internal' => false]);
    $m->created_at = Carbon::parse($at, 'UTC');

    return $m;
}

it('metrics returns empty for a ticket with no policy', function (): void {
    $t = new Ticket;
    $t->created_at = Carbon::parse('2026-07-29 10:00:00', 'UTC');
    $t->setRelation('slaPolicy', null);
    expect(SlaCalculator::metrics($t))->toBe([]);
});

it('metrics always includes first_reply and resolution for a policied ticket', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-29 10:30:00', 'UTC'));
    $t = metricsTicket(policyMetrics(60, 480), '2026-07-29 10:00:00'); // 24/7
    $metrics = collect(SlaCalculator::metrics($t));
    expect($metrics->pluck('metric')->all())->toBe(['first_reply', 'resolution']);
    expect($metrics->firstWhere('metric', 'resolution')['target_minutes'])->toBe(480);
});

it('metrics resolution is met when resolved before due, breached when after', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-29 20:00:00', 'UTC'));
    // 24/7, resolution 480m = 8h; created 10:00 → due 18:00
    $met = metricsTicket(policyMetrics(60, 480), '2026-07-29 10:00:00', '2026-07-29 10:05:00', '2026-07-29 17:00:00');
    expect(collect(SlaCalculator::metrics($met))->firstWhere('metric', 'resolution')['state'])->toBe('met');
    $breached = metricsTicket(policyMetrics(60, 480), '2026-07-29 10:00:00', '2026-07-29 10:05:00', '2026-07-29 19:00:00');
    expect(collect(SlaCalculator::metrics($breached))->firstWhere('metric', 'resolution')['state'])->toBe('breached');
    // unresolved, now past due → breached
    $overdue = metricsTicket(policyMetrics(60, 480), '2026-07-29 10:00:00', '2026-07-29 10:05:00');
    expect(collect(SlaCalculator::metrics($overdue))->firstWhere('metric', 'resolution')['state'])->toBe('breached');
});

it('metrics includes next_reply only when policy sets it, first reply happened, and latest public message is from the customer', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-29 12:00:00', 'UTC'));
    $policy = policyMetrics(60, 480, 120); // next_reply 120m
    // pending customer message at 11:30 → next_reply due at 13:30, state due
    $pending = metricsTicket($policy, '2026-07-29 09:00:00', '2026-07-29 09:10:00', null, contactMessage('2026-07-29 11:30:00'));
    $nr = collect(SlaCalculator::metrics($pending))->firstWhere('metric', 'next_reply');
    expect($nr)->not->toBeNull();
    expect($nr['state'])->toBe('due');
    expect($nr['target_minutes'])->toBe(120);
    // no next_reply target on the policy → omitted
    $noTarget = metricsTicket(policyMetrics(60, 480, null), '2026-07-29 09:00:00', '2026-07-29 09:10:00', null, contactMessage('2026-07-29 11:30:00'));
    expect(collect(SlaCalculator::metrics($noTarget))->firstWhere('metric', 'next_reply'))->toBeNull();
    // first reply not yet made → next_reply omitted (that is first_reply territory)
    $noFirst = metricsTicket($policy, '2026-07-29 09:00:00', null, null, contactMessage('2026-07-29 11:30:00'));
    expect(collect(SlaCalculator::metrics($noFirst))->firstWhere('metric', 'next_reply'))->toBeNull();
    // latest public message is from an agent → answered → omitted
    $agentMsg = new App\Models\TicketMessage(['sender_type' => 'user', 'is_internal' => false]);
    $agentMsg->created_at = Carbon::parse('2026-07-29 11:40:00', 'UTC');
    $answered = metricsTicket($policy, '2026-07-29 09:00:00', '2026-07-29 09:10:00', null, $agentMsg);
    expect(collect(SlaCalculator::metrics($answered))->firstWhere('metric', 'next_reply'))->toBeNull();
});

it('metrics remaining_minutes is business-time remaining when due, 0 otherwise', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-29 10:20:00', 'UTC'));
    // 24/7, first_reply 60m, created 10:00 → due 11:00; now 10:20 → 40m remaining
    $t = metricsTicket(policyMetrics(60, 480), '2026-07-29 10:00:00');
    $fr = collect(SlaCalculator::metrics($t))->firstWhere('metric', 'first_reply');
    expect($fr['state'])->toBe('due');
    expect($fr['remaining_minutes'])->toBe(40);
    expect($fr['within_business_hours'])->toBeTrue(); // null schedule → always in-hours
    // a met metric → remaining 0
    $met = metricsTicket(policyMetrics(60, 480), '2026-07-29 10:00:00', '2026-07-29 10:05:00');
    expect(collect(SlaCalculator::metrics($met))->firstWhere('metric', 'first_reply')['remaining_minutes'])->toBe(0);
});

it('metrics honours a recorded breach row stickily', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-29 10:20:00', 'UTC')); // before first_reply due 11:00
    $t = metricsTicket(policyMetrics(60, 480), '2026-07-29 10:00:00', null, null, null, ['first_reply']);
    expect(collect(SlaCalculator::metrics($t))->firstWhere('metric', 'first_reply')['state'])->toBe('breached');
});

it('businessMinutesBetween counts business minutes and clamps to 0 when to<=from', function (): void {
    // Wed 09:00–17:00; from Wed 16:00 to Thu 10:00 → 60 (Wed) + 60 (Thu 09-10) = 120
    $mins = SlaCalculator::businessMinutesBetween(Carbon::parse('2026-07-29 16:00:00', 'UTC'), Carbon::parse('2026-07-30 10:00:00', 'UTC'), weekdays9to5());
    expect($mins)->toBe(120);
    // 24/7 fallback = wall-clock
    expect(SlaCalculator::businessMinutesBetween(Carbon::parse('2026-07-29 10:00:00', 'UTC'), Carbon::parse('2026-07-29 12:30:00', 'UTC'), null))->toBe(150);
    // to <= from → 0
    expect(SlaCalculator::businessMinutesBetween(Carbon::parse('2026-07-29 12:00:00', 'UTC'), Carbon::parse('2026-07-29 11:00:00', 'UTC'), null))->toBe(0);
});

it('withinBusinessHours reflects the schedule', function (): void {
    expect(SlaCalculator::withinBusinessHours(Carbon::parse('2026-07-29 10:00:00', 'UTC'), weekdays9to5()))->toBeTrue();  // Wed 10:00
    expect(SlaCalculator::withinBusinessHours(Carbon::parse('2026-07-29 18:00:00', 'UTC'), weekdays9to5()))->toBeFalse(); // Wed 18:00
    expect(SlaCalculator::withinBusinessHours(Carbon::parse('2026-08-01 10:00:00', 'UTC'), weekdays9to5()))->toBeFalse(); // Saturday
    expect(SlaCalculator::withinBusinessHours(Carbon::parse('2026-08-01 03:00:00', 'UTC'), null))->toBeTrue();            // 24/7
});
