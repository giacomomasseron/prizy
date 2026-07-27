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
