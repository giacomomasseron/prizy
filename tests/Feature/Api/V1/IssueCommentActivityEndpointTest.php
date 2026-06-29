<?php

declare(strict_types=1);

use App\Events\IssueCommented;
use App\Events\IssueCreated;
use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

beforeEach(fn () => Event::fake([
    IssueCommented::class,
    IssueCreated::class,
]));

/** @return array{0:string,1:Issue} */
function commentWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $issue];
}

it('adds a comment (201) and lists comments (200)', function (): void {
    [$token, $issue] = commentWorld();

    $this->withToken($token)->postJson("/v1/issues/{$issue->id}/comments", ['body' => 'Hello', 'is_internal' => true])
        ->assertStatus(201)->assertJson(['data' => ['body' => 'Hello', 'is_internal' => true]]);

    $this->withToken($token)->getJson("/v1/issues/{$issue->id}/comments")
        ->assertStatus(200)->assertJsonCount(1, 'data');

    Workspace::forgetCurrent();
});

it('requires a body (422)', function (): void {
    [$token, $issue] = commentWorld();

    $this->withToken($token)->postJson("/v1/issues/{$issue->id}/comments", [])->assertStatus(422);

    Workspace::forgetCurrent();
});

it('lists activities including the created event', function (): void {
    // Create the issue THROUGH the API so a 'created' activity row exists
    // (a factory-made issue has none).
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    $created = $this->withToken($token)->postJson('/v1/issues', ['team_id' => $team->id, 'title' => 'A'])->json('data.id');

    $res = $this->withToken($token)->getJson("/v1/issues/{$created}/activities");
    $res->assertStatus(200);
    expect($res->json('data'))->not->toBeEmpty();

    Workspace::forgetCurrent();
});
