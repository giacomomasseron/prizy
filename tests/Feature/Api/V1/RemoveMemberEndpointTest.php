<?php
declare(strict_types=1);

use App\Models\Invitation;
use App\Models\Issue;
use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

function removeWorld(string $actorLevel, string $targetLevel): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create([
        'email_verified_at' => now(), 'admin_level' => $actorLevel, 'is_developer' => true,
    ]);
    $target = User::factory()->for($ws, 'workspace')->create([
        'email_verified_at' => now(), 'admin_level' => $targetLevel,
    ]);
    $token = app(CreatePersonalAccessToken::class)->handle($actor, 't', null)['token'];
    return [$token, $actor, $target, $ws];
}

it('owner can remove a member and nulls assignee + lead references and project_members rows', function (): void {
    [$token, $actor, $target, $ws] = removeWorld('owner', 'member');
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::forceCreate([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id,
        'team_id' => $team->id, 'created_by' => $actor->id,
        'title' => 'Test', 'assignee_id' => $target->id,
        'status' => 'todo', 'priority' => 'no_priority',
    ]);
    $project = Project::factory()->for($ws, 'workspace')->create(['lead_id' => $target->id]);
    \DB::table('project_members')->insert(['project_id' => $project->id, 'user_id' => $target->id, 'created_at' => now()]);

    $this->withToken($token)->deleteJson("/v1/members/{$target->id}")->assertStatus(204);
    expect(Issue::find($issue->id)->assignee_id)->toBeNull();
    expect(Project::find($project->id)->lead_id)->toBeNull();
    expect(\DB::table('project_members')->where('user_id', $target->id)->count())->toBe(0);
    expect(User::withTrashed()->find($target->id)->deleted_at)->not->toBeNull();
    Workspace::forgetCurrent();
});

it('remove nulls team_members rows', function (): void {
    [$token, $actor, $target, $ws] = removeWorld('owner', 'member');
    $team = Team::factory()->for($ws, 'workspace')->create();
    \DB::table('team_members')->insert(['team_id' => $team->id, 'user_id' => $target->id, 'role' => 'member', 'created_at' => now()]);

    $this->withToken($token)->deleteJson("/v1/members/{$target->id}")->assertStatus(204);
    expect(\DB::table('team_members')->where('user_id', $target->id)->count())->toBe(0);
    Workspace::forgetCurrent();
});

it('cannot remove self', function (): void {
    [$token, $actor] = removeWorld('owner', 'member');
    $this->withToken($token)->deleteJson("/v1/members/{$actor->id}")->assertStatus(403);
    Workspace::forgetCurrent();
});

it('the sole owner cannot remove themselves (self-remove guard ensures workspace keeps an owner)', function (): void {
    [$token, $actor] = removeWorld('owner', 'member');
    // Actor is the sole owner; trying to delete self → 403 (self-remove guard — the reachable path)
    $this->withToken($token)->deleteJson("/v1/members/{$actor->id}")->assertStatus(403);
    expect(User::find($actor->id)->deleted_at)->toBeNull(); // owner still active in DB
    Workspace::forgetCurrent();
});

it('admin cannot remove an owner', function (): void {
    [$token, , $target] = removeWorld('admin', 'owner');
    $this->withToken($token)->deleteJson("/v1/members/{$target->id}")->assertStatus(403);
    Workspace::forgetCurrent();
});

it('non-admin gets 403', function (): void {
    [$token, , $target] = removeWorld('member', 'member');
    $this->withToken($token)->deleteJson("/v1/members/{$target->id}")->assertStatus(403);
    Workspace::forgetCurrent();
});

it('returns 404 for user in another workspace', function (): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'admin_level' => 'owner', 'is_developer' => true]);
    $token = app(CreatePersonalAccessToken::class)->handle($actor, 't', null)['token'];
    $ws2 = Workspace::factory()->create();
    $ws2->makeCurrent();
    $other = User::factory()->for($ws2, 'workspace')->create(['email_verified_at' => now()]);
    test()->actingInWorkspace($ws);
    $this->withToken($token)->deleteJson("/v1/members/{$other->id}")->assertStatus(404);
    Workspace::forgetCurrent();
});

it('owner can cancel a pending invitation', function (): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'admin_level' => 'owner', 'is_developer' => true]);
    $token = app(CreatePersonalAccessToken::class)->handle($actor, 't', null)['token'];
    $inv = Invitation::forceCreate([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id,
        'email' => 'cancel@example.com', 'admin_level' => 'member',
        'is_developer' => true, 'is_agent' => false,
        'token_hash' => hash('sha256', Str::random(40)),
        'invited_by' => $actor->id, 'expires_at' => now()->addHours(72),
    ]);
    $this->withToken($token)->deleteJson("/v1/invitations/{$inv->id}")->assertStatus(204);
    $this->assertDatabaseMissing('invitations', ['id' => $inv->id]);
    Workspace::forgetCurrent();
});
