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
