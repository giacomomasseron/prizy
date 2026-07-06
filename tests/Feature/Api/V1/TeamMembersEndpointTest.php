<?php
declare(strict_types=1);

use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:string,1:User,2:Workspace,3:Team} */
function teamMembersWorld(string $actorLevel = 'admin'): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create([
        'email_verified_at' => now(), 'admin_level' => $actorLevel, 'is_developer' => true,
    ]);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $token = app(CreatePersonalAccessToken::class)->handle($actor, 't', null)['token'];
    return [$token, $actor, $ws, $team];
}

function addMemberRow(string $teamId, string $userId, string $role = 'member'): void
{
    \DB::table('team_members')->insert([
        'team_id' => $teamId, 'user_id' => $userId, 'role' => $role, 'created_at' => now(),
    ]);
}

it('GET /teams returns member_count and lead', function (): void {
    [$token, $actor, $ws, $team] = teamMembersWorld();
    $lead = User::factory()->for($ws, 'workspace')->create(['name' => 'Lead Person']);
    $member = User::factory()->for($ws, 'workspace')->create();
    addMemberRow($team->id, $lead->id, 'lead');
    addMemberRow($team->id, $member->id, 'member');

    $res = $this->withToken($token)->getJson('/v1/teams')->assertStatus(200);
    $row = collect($res->json('data'))->firstWhere('id', $team->id);
    expect($row['member_count'])->toBe(2);
    expect($row['lead'])->toMatchArray(['id' => $lead->id, 'name' => 'Lead Person']);
    Workspace::forgetCurrent();
});

it('GET /teams lead is null when no lead', function (): void {
    [$token, $actor, $ws, $team] = teamMembersWorld();
    $res = $this->withToken($token)->getJson('/v1/teams')->assertStatus(200);
    $row = collect($res->json('data'))->firstWhere('id', $team->id);
    expect($row['member_count'])->toBe(0);
    expect($row['lead'])->toBeNull();
    Workspace::forgetCurrent();
});

it('GET /teams/{team}/members returns members lead-first with roles', function (): void {
    [$token, $actor, $ws, $team] = teamMembersWorld();
    $lead = User::factory()->for($ws, 'workspace')->create(['name' => 'Zoe', 'email' => 'zoe@x.test']);
    $member = User::factory()->for($ws, 'workspace')->create(['name' => 'Amy', 'email' => 'amy@x.test']);
    addMemberRow($team->id, $lead->id, 'lead');
    addMemberRow($team->id, $member->id, 'member');

    $res = $this->withToken($token)->getJson("/v1/teams/{$team->id}/members")->assertStatus(200);
    $data = $res->json('data');
    expect($data)->toHaveCount(2);
    expect($data[0]['role'])->toBe('lead');            // lead first despite name order
    expect($data[0])->toMatchArray(['id' => $lead->id, 'name' => 'Zoe', 'email' => 'zoe@x.test']);
    expect($data[1]['role'])->toBe('member');
    Workspace::forgetCurrent();
});

it('GET /teams/{team}/members forbids a non-admin', function (): void {
    [$token, $actor, $ws, $team] = teamMembersWorld('member');
    $this->withToken($token)->getJson("/v1/teams/{$team->id}/members")->assertStatus(403);
    Workspace::forgetCurrent();
});

it('GET /teams/{team}/members 404s for a cross-workspace team', function (): void {
    [$token, $actor, $ws, $team] = teamMembersWorld();
    $ws2 = Workspace::factory()->create();
    $ws2->makeCurrent();
    $foreign = Team::factory()->for($ws2, 'workspace')->create();
    test()->actingInWorkspace($ws);
    $this->withToken($token)->getJson("/v1/teams/{$foreign->id}/members")->assertStatus(404);
    Workspace::forgetCurrent();
});

it('POST adds a workspace member (default role member)', function (): void {
    [$token, $actor, $ws, $team] = teamMembersWorld();
    $u = User::factory()->for($ws, 'workspace')->create(['name' => 'New Guy', 'email' => 'ng@x.test']);
    $this->withToken($token)->postJson("/v1/teams/{$team->id}/members", ['user_id' => $u->id])
        ->assertStatus(201)->assertJson(['data' => ['id' => $u->id, 'role' => 'member']]);
    expect(\DB::table('team_members')->where('team_id', $team->id)->where('user_id', $u->id)->count())->toBe(1);
    Workspace::forgetCurrent();
});

it('POST with role=lead demotes the existing lead (single-lead invariant)', function (): void {
    [$token, $actor, $ws, $team] = teamMembersWorld();
    $oldLead = User::factory()->for($ws, 'workspace')->create();
    addMemberRow($team->id, $oldLead->id, 'lead');
    $newLead = User::factory()->for($ws, 'workspace')->create();

    $this->withToken($token)->postJson("/v1/teams/{$team->id}/members", ['user_id' => $newLead->id, 'role' => 'lead'])
        ->assertStatus(201);
    expect(\DB::table('team_members')->where('team_id', $team->id)->where('role', 'lead')->count())->toBe(1);
    expect(\DB::table('team_members')->where('team_id', $team->id)->where('user_id', $newLead->id)->value('role'))->toBe('lead');
    expect(\DB::table('team_members')->where('team_id', $team->id)->where('user_id', $oldLead->id)->value('role'))->toBe('member');
    Workspace::forgetCurrent();
});

it('POST rejects a foreign-workspace user with 422', function (): void {
    [$token, $actor, $ws, $team] = teamMembersWorld();
    $ws2 = Workspace::factory()->create();
    $ws2->makeCurrent();
    $foreign = User::factory()->for($ws2, 'workspace')->create();
    test()->actingInWorkspace($ws);
    $this->withToken($token)->postJson("/v1/teams/{$team->id}/members", ['user_id' => $foreign->id])
        ->assertStatus(422);
    expect(\DB::table('team_members')->where('team_id', $team->id)->where('user_id', $foreign->id)->count())->toBe(0);
    Workspace::forgetCurrent();
});

it('POST rejects a duplicate member with 422', function (): void {
    [$token, $actor, $ws, $team] = teamMembersWorld();
    $u = User::factory()->for($ws, 'workspace')->create();
    addMemberRow($team->id, $u->id, 'member');
    $this->withToken($token)->postJson("/v1/teams/{$team->id}/members", ['user_id' => $u->id])
        ->assertStatus(422);
    expect(\DB::table('team_members')->where('team_id', $team->id)->where('user_id', $u->id)->count())->toBe(1);
    Workspace::forgetCurrent();
});

it('POST forbids a non-admin caller', function (): void {
    [$token, $actor, $ws, $team] = teamMembersWorld('member');
    $u = User::factory()->for($ws, 'workspace')->create();
    $this->withToken($token)->postJson("/v1/teams/{$team->id}/members", ['user_id' => $u->id])
        ->assertStatus(403);
    expect(\DB::table('team_members')->where('team_id', $team->id)->where('user_id', $u->id)->count())->toBe(0);
    Workspace::forgetCurrent();
});

it('PATCH promotes a member to lead and demotes the prior lead', function (): void {
    [$token, $actor, $ws, $team] = teamMembersWorld();
    $oldLead = User::factory()->for($ws, 'workspace')->create();
    $member = User::factory()->for($ws, 'workspace')->create();
    addMemberRow($team->id, $oldLead->id, 'lead');
    addMemberRow($team->id, $member->id, 'member');

    $this->withToken($token)->patchJson("/v1/teams/{$team->id}/members/{$member->id}", ['role' => 'lead'])
        ->assertStatus(200)->assertJson(['data' => ['id' => $member->id, 'role' => 'lead']]);
    expect(\DB::table('team_members')->where('team_id', $team->id)->where('role', 'lead')->count())->toBe(1);
    expect(\DB::table('team_members')->where('team_id', $team->id)->where('user_id', $oldLead->id)->value('role'))->toBe('member');
    Workspace::forgetCurrent();
});

it('PATCH demotes a lead to member', function (): void {
    [$token, $actor, $ws, $team] = teamMembersWorld();
    $lead = User::factory()->for($ws, 'workspace')->create();
    addMemberRow($team->id, $lead->id, 'lead');
    $this->withToken($token)->patchJson("/v1/teams/{$team->id}/members/{$lead->id}", ['role' => 'member'])
        ->assertStatus(200);
    expect(\DB::table('team_members')->where('team_id', $team->id)->where('role', 'lead')->count())->toBe(0);
    Workspace::forgetCurrent();
});

it('PATCH 404s for a non-member target', function (): void {
    [$token, $actor, $ws, $team] = teamMembersWorld();
    $stranger = User::factory()->for($ws, 'workspace')->create();
    $this->withToken($token)->patchJson("/v1/teams/{$team->id}/members/{$stranger->id}", ['role' => 'lead'])
        ->assertStatus(404);
    Workspace::forgetCurrent();
});

it('DELETE removes a member (row gone, 204)', function (): void {
    [$token, $actor, $ws, $team] = teamMembersWorld();
    $u = User::factory()->for($ws, 'workspace')->create();
    addMemberRow($team->id, $u->id, 'member');
    $this->withToken($token)->deleteJson("/v1/teams/{$team->id}/members/{$u->id}")->assertStatus(204);
    expect(\DB::table('team_members')->where('team_id', $team->id)->where('user_id', $u->id)->count())->toBe(0);
    Workspace::forgetCurrent();
});

it('PATCH and DELETE forbid a non-admin', function (): void {
    [$token, $actor, $ws, $team] = teamMembersWorld('member');
    $u = User::factory()->for($ws, 'workspace')->create();
    addMemberRow($team->id, $u->id, 'member');
    $this->withToken($token)->patchJson("/v1/teams/{$team->id}/members/{$u->id}", ['role' => 'lead'])->assertStatus(403);
    expect(\DB::table('team_members')->where('team_id', $team->id)->where('user_id', $u->id)->value('role'))->toBe('member');
    $this->withToken($token)->deleteJson("/v1/teams/{$team->id}/members/{$u->id}")->assertStatus(403);
    expect(\DB::table('team_members')->where('team_id', $team->id)->where('user_id', $u->id)->count())->toBe(1);
    Workspace::forgetCurrent();
});

it('the DB rejects a second lead per team (partial unique index)', function (): void {
    [$token, $actor, $ws, $team] = teamMembersWorld();
    $u1 = User::factory()->for($ws, 'workspace')->create();
    $u2 = User::factory()->for($ws, 'workspace')->create();
    addMemberRow($team->id, $u1->id, 'lead');
    \DB::statement('SAVEPOINT before_second_lead');
    expect(fn () => addMemberRow($team->id, $u2->id, 'lead'))->toThrow(\Illuminate\Database\QueryException::class);
    \DB::statement('ROLLBACK TO SAVEPOINT before_second_lead');
    expect(\DB::table('team_members')->where('team_id', $team->id)->where('role', 'lead')->count())->toBe(1);
    Workspace::forgetCurrent();
});
