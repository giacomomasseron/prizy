<?php

declare(strict_types=1);

use App\Models\Invitation;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

function wsMembersWorld(string $level = 'owner'): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create([
        'email_verified_at' => now(),
        'admin_level' => $level,
        'is_developer' => true,
    ]);
    $token = app(CreatePersonalAccessToken::class)->handle($actor, 't', null)['token'];
    return [$token, $ws, $actor];
}

it('returns active members and pending invitations for owner', function (): void {
    [$token, $ws, $actor] = wsMembersWorld('owner');

    $member = User::factory()->for($ws, 'workspace')->create([
        'email_verified_at' => now(), 'admin_level' => 'member', 'is_developer' => true,
    ]);
    $inv = Invitation::forceCreate([
        'id'          => (string) Str::uuid(),
        'workspace_id'=> $ws->id,
        'email'       => 'pending@example.com',
        'admin_level' => 'member',
        'is_developer'=> true,
        'is_agent'    => false,
        'token_hash'  => hash('sha256', Str::random(40)),
        'invited_by'  => $actor->id,
        'expires_at'  => now()->addHours(72),
    ]);

    $res = $this->withToken($token)->getJson('/v1/workspace/members')
        ->assertStatus(200);

    $data = $res->json('data');
    expect(collect($data)->pluck('status')->sort()->values()->all())->toBe(collect(['active','active','invited'])->sort()->values()->all());
    expect(collect($data)->firstWhere('status', 'invited')['id'])->toBe('inv:' . $inv->id);
    Workspace::forgetCurrent();
});

it('includes teams for active members', function (): void {
    [$token, $ws, $actor] = wsMembersWorld('owner');
    $team = Team::factory()->for($ws, 'workspace')->create(['identifier' => 'ENG', 'color' => '#ff0000']);
    \DB::table('team_members')->insert(['team_id' => $team->id, 'user_id' => $actor->id, 'role' => 'member', 'created_at' => now()]);

    $res = $this->withToken($token)->getJson('/v1/workspace/members')->assertStatus(200);
    $me = collect($res->json('data'))->firstWhere('id', $actor->id);
    expect($me['teams'])->not->toBeEmpty();
    expect($me['teams'][0]['identifier'])->toBe('ENG');
    Workspace::forgetCurrent();
});

it('returns 403 for a non-admin member', function (): void {
    [$token] = wsMembersWorld('member');
    $this->withToken($token)->getJson('/v1/workspace/members')->assertStatus(403);
    Workspace::forgetCurrent();
});

it('does not expose another workspace members', function (): void {
    [$token, $wsA] = wsMembersWorld('owner');

    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();
    User::factory()->for($wsB, 'workspace')->create(['email_verified_at' => now()]);
    Workspace::forgetCurrent();

    test()->actingInWorkspace($wsA);
    $res = $this->withToken($token)->getJson('/v1/workspace/members')->assertStatus(200);
    $emails = collect($res->json('data'))->pluck('email');
    foreach ($emails as $email) {
        expect(User::where('email', $email)->first()?->workspace_id)->toBe($wsA->id);
    }
    Workspace::forgetCurrent();
});
