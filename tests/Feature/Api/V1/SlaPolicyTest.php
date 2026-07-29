<?php

declare(strict_types=1);

use App\Models\BusinessHourSchedule;
use App\Models\Contact;
use App\Models\SlaPolicy;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:string,1:Workspace,2:User} */
function slapWorld(array $userAttrs = ['is_agent' => true]): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $userAttrs));
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws, $user];
}

function slapPayload(array $over = []): array
{
    return array_merge(['name' => 'Enterprise', 'first_reply_minutes' => 60, 'next_reply_minutes' => 120, 'resolution_minutes' => 480, 'schedule_id' => null], $over);
}

afterEach(fn () => Workspace::forgetCurrent());

it('creates a policy (with a schedule) and lists workspace policies', function (): void {
    [$token, $ws] = slapWorld();
    $sched = BusinessHourSchedule::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Standard', 'timezone' => 'UTC']);
    $res = $this->withToken($token)->postJson('/v1/sla-policies', slapPayload(['schedule_id' => $sched->id]))->assertStatus(201);
    expect($res->json('data.name'))->toBe('Enterprise');
    expect($res->json('data.first_reply_minutes'))->toBe(60);
    expect($res->json('data.schedule_name'))->toBe('Standard');

    $list = $this->withToken($token)->getJson('/v1/sla-policies')->assertStatus(200);
    expect(collect($list->json('data'))->pluck('name')->all())->toBe(['Enterprise']);
});

it('accepts a null schedule (24/7)', function (): void {
    [$token] = slapWorld();
    $res = $this->withToken($token)->postJson('/v1/sla-policies', slapPayload(['schedule_id' => null, 'next_reply_minutes' => null]))->assertStatus(201);
    expect($res->json('data.schedule_id'))->toBeNull();
    expect($res->json('data.next_reply_minutes'))->toBeNull();
});

it('updates and shows only workspace policies (cross-workspace → 404)', function (): void {
    [$token, $ws] = slapWorld();
    $id = $this->withToken($token)->postJson('/v1/sla-policies', slapPayload())->json('data.id');
    $this->withToken($token)->patchJson("/v1/sla-policies/{$id}", slapPayload(['name' => 'Renamed', 'resolution_minutes' => 240]))->assertStatus(200);
    expect(SlaPolicy::find($id)->resolution_minutes)->toBe(240);

    $other = Workspace::factory()->create();
    $other->makeCurrent();
    $otherP = SlaPolicy::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $other->id, 'name' => 'X', 'first_reply_minutes' => 30, 'resolution_minutes' => 300]);
    $ws->makeCurrent();
    $this->withToken($token)->getJson("/v1/sla-policies/{$otherP->id}")->assertStatus(404);
    $this->withToken($token)->patchJson("/v1/sla-policies/{$otherP->id}", slapPayload())->assertStatus(404);
    $this->withToken($token)->deleteJson("/v1/sla-policies/{$otherP->id}")->assertStatus(404);
});

it('deletes a policy and nulls a referencing ticket', function (): void {
    [$token, $ws] = slapWorld();
    $id = $this->withToken($token)->postJson('/v1/sla-policies', slapPayload())->json('data.id');
    $contact = Contact::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'C', 'email' => 'c'.Str::uuid().'@x.com']);
    $ticket = Ticket::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'requester_id' => $contact->id, 'subject' => 'S', 'status' => 'open', 'priority' => 'high', 'channel' => 'email', 'sla_policy_id' => $id]);

    $this->withToken($token)->deleteJson("/v1/sla-policies/{$id}")->assertStatus(204);
    expect(SlaPolicy::find($id))->toBeNull();
    expect(Ticket::find($ticket->id)->sla_policy_id)->toBeNull();
});

it('forbids a non-agent (403) on all verbs', function (): void {
    [$agentToken, $ws] = slapWorld();
    $id = $this->withToken($agentToken)->postJson('/v1/sla-policies', slapPayload())->json('data.id');
    $nonAgent = User::factory()->for($ws, 'workspace')->create(['is_agent' => false, 'admin_level' => 'owner', 'email_verified_at' => now()]);
    $t = app(CreatePersonalAccessToken::class)->handle($nonAgent, 't', null)['token'];
    $this->withToken($t)->getJson('/v1/sla-policies')->assertStatus(403);
    $this->withToken($t)->postJson('/v1/sla-policies', slapPayload())->assertStatus(403);
    $this->withToken($t)->getJson("/v1/sla-policies/{$id}")->assertStatus(403);
    $this->withToken($t)->patchJson("/v1/sla-policies/{$id}", slapPayload())->assertStatus(403);
    $this->withToken($t)->deleteJson("/v1/sla-policies/{$id}")->assertStatus(403);
});

it('validates name, min:1 minutes, and cross-workspace schedule_id (422)', function (): void {
    [$token, $ws] = slapWorld();
    $this->withToken($token)->postJson('/v1/sla-policies', slapPayload(['name' => '']))->assertStatus(422);
    $this->withToken($token)->postJson('/v1/sla-policies', slapPayload(['first_reply_minutes' => 0]))->assertStatus(422);
    $this->withToken($token)->postJson('/v1/sla-policies', slapPayload(['resolution_minutes' => null]))->assertStatus(422);
    // a schedule that exists only in another workspace → not found under RLS → 422
    $other = Workspace::factory()->create();
    $other->makeCurrent();
    $otherSched = BusinessHourSchedule::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $other->id, 'name' => 'O', 'timezone' => 'UTC']);
    $ws->makeCurrent();
    $this->withToken($token)->postJson('/v1/sla-policies', slapPayload(['schedule_id' => $otherSched->id]))->assertStatus(422);
});
