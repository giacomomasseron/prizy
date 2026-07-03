<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\Events\IssueAssigned;
use App\Events\IssueCreated;
use App\Events\IssueUpdated;
use App\Events\NotificationCreated;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

// Fake only broadcast events so Reverb is not contacted, while keeping Eloquent model events intact.
beforeEach(fn () => Event::fake([IssueCreated::class, IssueUpdated::class, IssueAssigned::class, NotificationCreated::class]));

/** @return array{0:string,1:Team,2:User} */
function writeWorld(array $userAttrs = []): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(
        ['email_verified_at' => now(), 'is_developer' => true, 'admin_level' => 'member'],
        $userAttrs,
    ));
    $team = Team::factory()->for($ws, 'workspace')->create();
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $team, $user];
}

it('creates an issue and returns 201 with the data envelope', function (): void {
    [$token, $team] = writeWorld();

    $res = $this->withToken($token)->postJson('/v1/issues', ['team_id' => $team->id, 'title' => 'New']);

    $res->assertStatus(201)->assertJson(['data' => ['title' => 'New', 'status' => 'backlog']]);
    $this->assertDatabaseHas('issues', ['title' => 'New']);

    Workspace::forgetCurrent();
});

it('rejects a bad priority enum with 422 (not 500)', function (): void {
    [$token, $team] = writeWorld();

    $this->withToken($token)->postJson('/v1/issues', ['team_id' => $team->id, 'title' => 'X', 'priority' => 'wat'])
        ->assertStatus(422);

    Workspace::forgetCurrent();
});

it('updates an issue and returns 200', function (): void {
    [$token, $team, $user] = writeWorld();
    $ws = Workspace::current();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id, 'title' => 'Old']);

    $res = $this->withToken($token)->patchJson("/v1/issues/{$issue->id}", ['title' => 'Renamed']);

    $res->assertStatus(200)->assertJson(['data' => ['title' => 'Renamed']]);

    Workspace::forgetCurrent();
});

it('forbids a non-developer from creating (403)', function (): void {
    [$token, $team] = writeWorld(['is_developer' => false]);

    $this->withToken($token)->postJson('/v1/issues', ['team_id' => $team->id, 'title' => 'X'])
        ->assertStatus(403);

    Workspace::forgetCurrent();
});

it('forbids an unverified user from creating (403)', function (): void {
    [$token, $team] = writeWorld(['email_verified_at' => null]);

    $this->withToken($token)->postJson('/v1/issues', ['team_id' => $team->id, 'title' => 'X'])
        ->assertStatus(403);

    Workspace::forgetCurrent();
});
