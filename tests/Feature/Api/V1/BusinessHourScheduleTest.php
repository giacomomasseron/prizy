<?php

declare(strict_types=1);

use App\Models\BusinessHourSchedule;
use App\Models\SlaPolicy;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:string,1:Workspace,2:User} */
function bhWorld(array $userAttrs = ['is_agent' => true]): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $userAttrs));
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws, $user];
}

function bhPayload(array $over = []): array
{
    return array_merge([
        'name' => 'Standard',
        'timezone' => 'UTC',
        'intervals' => [
            ['day_of_week' => 1, 'opens_at' => '09:00', 'closes_at' => '17:00'],
            ['day_of_week' => 2, 'opens_at' => '09:00', 'closes_at' => '17:00'],
        ],
    ], $over);
}

afterEach(fn () => Workspace::forgetCurrent());

it('creates a schedule with its intervals', function (): void {
    [$token, $ws] = bhWorld();
    $res = $this->withToken($token)->postJson('/v1/business-hours', bhPayload())->assertStatus(201);
    $id = $res->json('data.id');
    expect($res->json('data.name'))->toBe('Standard');
    expect($res->json('data.intervals'))->toHaveCount(2);
    expect($res->json('data.intervals.0.opens_at'))->toBe('09:00');
    expect(DB::table('business_hour_intervals')->where('schedule_id', $id)->count())->toBe(2);
});

it('lists and shows workspace schedules only', function (): void {
    [$token, $ws] = bhWorld();
    $this->withToken($token)->postJson('/v1/business-hours', bhPayload(['name' => 'A']))->assertStatus(201);
    $other = Workspace::factory()->create();
    $other->makeCurrent();
    $otherSched = BusinessHourSchedule::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $other->id, 'name' => 'Other', 'timezone' => 'UTC']);
    $ws->makeCurrent();

    $list = $this->withToken($token)->getJson('/v1/business-hours')->assertStatus(200);
    expect(collect($list->json('data'))->pluck('name')->all())->toBe(['A']);
    $this->withToken($token)->getJson("/v1/business-hours/{$otherSched->id}")->assertStatus(404);
});

it('update replaces the intervals', function (): void {
    [$token, $ws] = bhWorld();
    $id = $this->withToken($token)->postJson('/v1/business-hours', bhPayload())->json('data.id');
    $this->withToken($token)->patchJson("/v1/business-hours/{$id}", bhPayload([
        'name' => 'Renamed',
        'intervals' => [['day_of_week' => 5, 'opens_at' => '10:00', 'closes_at' => '14:00']],
    ]))->assertStatus(200);
    expect(DB::table('business_hour_intervals')->where('schedule_id', $id)->count())->toBe(1);
    $rows = DB::table('business_hour_intervals')->where('schedule_id', $id)->get();
    expect((int) $rows[0]->day_of_week)->toBe(5);
});

it('deletes a schedule and nulls a referencing SLA policy', function (): void {
    [$token, $ws] = bhWorld();
    $id = $this->withToken($token)->postJson('/v1/business-hours', bhPayload())->json('data.id');
    $policy = SlaPolicy::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'P', 'first_reply_minutes' => 60, 'resolution_minutes' => 480, 'schedule_id' => $id]);

    $this->withToken($token)->deleteJson("/v1/business-hours/{$id}")->assertStatus(204);
    expect(BusinessHourSchedule::find($id))->toBeNull();
    expect(SlaPolicy::find($policy->id)->schedule_id)->toBeNull();
});

it('forbids a non-agent (403)', function (): void {
    [$token] = bhWorld(['is_agent' => false, 'admin_level' => 'owner']);
    $this->withToken($token)->getJson('/v1/business-hours')->assertStatus(403);
    $this->withToken($token)->postJson('/v1/business-hours', bhPayload())->assertStatus(403);
});

it('forbids a non-agent from show/update/delete (403)', function (): void {
    [$agentToken, $ws] = bhWorld();
    $id = $this->withToken($agentToken)->postJson('/v1/business-hours', bhPayload())->json('data.id');

    $nonAgent = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_agent' => false, 'admin_level' => 'owner']);
    $nonAgentToken = app(CreatePersonalAccessToken::class)->handle($nonAgent, 't', null)['token'];

    $this->withToken($nonAgentToken)->getJson("/v1/business-hours/{$id}")->assertStatus(403);
    $this->withToken($nonAgentToken)->patchJson("/v1/business-hours/{$id}", bhPayload())->assertStatus(403);
    $this->withToken($nonAgentToken)->deleteJson("/v1/business-hours/{$id}")->assertStatus(403);
});

it('forbids cross-workspace update/delete (404)', function (): void {
    [$aToken, $ws] = bhWorld();
    $other = Workspace::factory()->create();
    $other->makeCurrent();
    $bSched = BusinessHourSchedule::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $other->id, 'name' => 'B', 'timezone' => 'UTC']);
    $ws->makeCurrent();

    $this->withToken($aToken)->patchJson("/v1/business-hours/{$bSched->id}", bhPayload())->assertStatus(404);
    $this->withToken($aToken)->deleteJson("/v1/business-hours/{$bSched->id}")->assertStatus(404);
});

it('validates name, timezone, day_of_week, and opens<closes (422)', function (): void {
    [$token] = bhWorld();
    $this->withToken($token)->postJson('/v1/business-hours', bhPayload(['name' => '']))->assertStatus(422);
    $this->withToken($token)->postJson('/v1/business-hours', bhPayload(['timezone' => 'Not/AZone']))->assertStatus(422);
    $this->withToken($token)->postJson('/v1/business-hours', bhPayload(['intervals' => [['day_of_week' => 9, 'opens_at' => '09:00', 'closes_at' => '17:00']]]))->assertStatus(422);
    $this->withToken($token)->postJson('/v1/business-hours', bhPayload(['intervals' => [['day_of_week' => 1, 'opens_at' => '17:00', 'closes_at' => '09:00']]]))->assertStatus(422);
});
