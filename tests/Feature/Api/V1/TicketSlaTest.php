<?php

declare(strict_types=1);

use App\Models\BusinessHourSchedule;
use App\Models\Contact;
use App\Models\SlaPolicy;
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
function slaWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_agent' => true]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws, $user];
}

function weekday9to5Policy(Workspace $ws): SlaPolicy
{
    $schedule = BusinessHourSchedule::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Standard', 'timezone' => 'UTC']);
    foreach ([1, 2, 3, 4, 5] as $dow) {
        DB::table('business_hour_intervals')->insert(['id' => (string) Str::uuid(), 'schedule_id' => $schedule->id, 'day_of_week' => $dow, 'opens_at' => '09:00:00', 'closes_at' => '17:00:00']);
    }

    return SlaPolicy::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Standard SLA', 'first_reply_minutes' => 60, 'resolution_minutes' => 480, 'schedule_id' => $schedule->id]);
}

function slaTicket(Workspace $ws, ?SlaPolicy $policy, array $attrs): Ticket
{
    $contact = Contact::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Grace', 'email' => 'g'.Str::uuid().'@x.com']);

    return Ticket::forceCreate(array_merge([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'requester_id' => $contact->id,
        'subject' => 'S', 'status' => 'open', 'priority' => 'high', 'channel' => 'email',
        'sla_policy_id' => $policy?->id,
    ], $attrs));
}

/**
 * An agent token + a ticket on a policy (Wed 10:00 UTC creation, unreplied). Pass policy
 * attribute overrides (e.g. ['next_reply_minutes' => 120]) to tune the seeded SlaPolicy.
 *
 * @param  array<string, mixed>  $policyAttrs
 * @return array{0:string,1:Workspace,2:Ticket}
 */
function ticketSlaWorld(array $policyAttrs = []): array
{
    [$token, $ws] = slaWorld();
    $policy = weekday9to5Policy($ws);
    if ($policyAttrs !== []) {
        $policy->forceFill($policyAttrs)->save();
    }
    $ticket = slaTicket($ws, $policy, ['created_at' => Carbon::parse('2026-07-29 10:00:00', 'UTC'), 'first_replied_at' => null]);

    return [$token, $ws, $ticket];
}

afterEach(fn () => Carbon::setTestNow());

it('exposes a due first-reply SLA on the index for an unreplied policy ticket', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-29 10:40:00', 'UTC')); // Wed, inside 09–17
    [$token, $ws] = slaWorld();
    $policy = weekday9to5Policy($ws);
    slaTicket($ws, $policy, ['created_at' => Carbon::parse('2026-07-29 10:00:00', 'UTC'), 'first_replied_at' => null]);

    $res = $this->withToken($token)->getJson('/v1/tickets')->assertStatus(200);
    expect($res->json('data.0.sla.state'))->toBe('due');
    expect($res->json('data.0.sla.target_minutes'))->toBe(60);
    expect($res->json('data.0.sla.due_at'))->not->toBeNull();
    expect($res->json('data.0.sla.policy_name'))->toBe('Standard SLA');

    Workspace::forgetCurrent();
});

it('exposes a met SLA on show when replied before the deadline', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-29 12:00:00', 'UTC'));
    [$token, $ws] = slaWorld();
    $policy = weekday9to5Policy($ws);
    $ticket = slaTicket($ws, $policy, ['created_at' => Carbon::parse('2026-07-29 10:00:00', 'UTC'), 'first_replied_at' => Carbon::parse('2026-07-29 10:30:00', 'UTC')]);

    $res = $this->withToken($token)->getJson("/v1/tickets/{$ticket->id}")->assertStatus(200);
    expect($res->json('data.sla.state'))->toBe('met');

    Workspace::forgetCurrent();
});

it('reports state none and null due_at when the ticket has no policy', function (): void {
    [$token, $ws] = slaWorld();
    $ticket = slaTicket($ws, null, ['created_at' => now()]);

    $res = $this->withToken($token)->getJson("/v1/tickets/{$ticket->id}")->assertStatus(200);
    expect($res->json('data.sla.state'))->toBe('none');
    expect($res->json('data.sla.due_at'))->toBeNull();

    Workspace::forgetCurrent();
});

it('exposes sla_metrics with first_reply and resolution for a policied ticket', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-29 12:00:00', 'UTC'));
    [$token, $ws, $ticket] = ticketSlaWorld(); // existing helper: agent token + a ticket on a policy
    // (the helper's ticket has an SLA policy; see the file's existing 'sla' test)

    $res = $this->withToken($token)->getJson("/v1/tickets/{$ticket->id}")->assertStatus(200);
    $metrics = collect($res->json('data.sla_metrics'));
    expect($metrics->pluck('metric'))->toContain('first_reply');
    expect($metrics->pluck('metric'))->toContain('resolution');
    $fr = $metrics->firstWhere('metric', 'first_reply');
    expect($fr)->toHaveKeys(['metric', 'policy_name', 'target_minutes', 'due_at', 'state', 'remaining_minutes', 'within_business_hours']);
    // the legacy first-reply `sla` field is unchanged
    expect($res->json('data.sla.state'))->toBe($fr['state']);

    Workspace::forgetCurrent();
});

it('includes next_reply in sla_metrics when a pending customer message exists', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-07-29 12:00:00', 'UTC'));
    [$token, $ws, $ticket] = ticketSlaWorld(['next_reply_minutes' => 120]);
    // first reply already happened + a later customer message → next_reply pending
    $ticket->forceFill(['first_replied_at' => Carbon::parse('2026-07-29 09:10:00', 'UTC')])->save();
    DB::table('ticket_messages')->insert([
        'id' => (string) Str::uuid(), 'ticket_id' => $ticket->id, 'sender_type' => 'contact',
        'sender_contact_id' => $ticket->requester_id, 'body' => 'still broken', 'is_internal' => false,
        'channel' => 'email', 'created_at' => Carbon::parse('2026-07-29 11:30:00', 'UTC'), 'updated_at' => Carbon::parse('2026-07-29 11:30:00', 'UTC'),
    ]);

    $res = $this->withToken($token)->getJson("/v1/tickets/{$ticket->id}")->assertStatus(200);
    $nr = collect($res->json('data.sla_metrics'))->firstWhere('metric', 'next_reply');
    expect($nr)->not->toBeNull();
    expect($nr['target_minutes'])->toBe(120);

    Workspace::forgetCurrent();
});
