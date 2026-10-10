<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\IssueActivity;
use App\Models\IssueStar;
use App\Models\Notification;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{token:string, issue:Issue, user:User, workspace:Workspace} */
function starWorld(array $userAttrs = ['is_developer' => true]): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $userAttrs));
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return ['token' => $token, 'issue' => $issue, 'user' => $user, 'workspace' => $ws];
}

afterEach(fn () => Workspace::forgetCurrent());

it('stars an issue for the caller (200, starred, starred_at)', function (): void {
    ['token' => $token, 'issue' => $issue, 'user' => $user] = starWorld();

    $this->withToken($token)->putJson("/v1/issues/{$issue->id}/star")
        ->assertStatus(200)
        ->assertJsonPath('data.issue_id', $issue->id)
        ->assertJsonPath('data.starred', true);

    $star = IssueStar::query()->where('user_id', $user->id)->where('issue_id', $issue->id)->first();
    expect($star)->not->toBeNull();
});

it('is idempotent: a second star keeps the first starred_at and never fails', function (): void {
    ['token' => $token, 'issue' => $issue] = starWorld();
    $url = "/v1/issues/{$issue->id}/star";

    $first = $this->withToken($token)->putJson($url)->assertStatus(200)->json('data.starred_at');
    $this->travel(5)->minutes();
    $second = $this->withToken($token)->putJson($url)->assertStatus(200)->json('data.starred_at');

    expect($second)->toBe($first);
    expect(IssueStar::query()->where('issue_id', $issue->id)->count())->toBe(1);
});

it('unstars, and unstarring an unstarred issue still succeeds', function (): void {
    ['token' => $token, 'issue' => $issue] = starWorld();
    $url = "/v1/issues/{$issue->id}/star";
    $this->withToken($token)->putJson($url)->assertStatus(200);

    $this->withToken($token)->deleteJson($url)
        ->assertStatus(200)
        ->assertJsonPath('data.starred', false)
        ->assertJsonPath('data.starred_at', null);
    expect(IssueStar::query()->where('issue_id', $issue->id)->count())->toBe(0);

    $this->withToken($token)->deleteJson($url)->assertStatus(200)->assertJsonPath('data.starred', false);
});

it('lets a viewer star an issue they can see', function (): void {
    ['token' => $token, 'issue' => $issue] = starWorld(['admin_level' => 'viewer', 'is_developer' => false]);

    $this->withToken($token)->putJson("/v1/issues/{$issue->id}/star")->assertStatus(200)->assertJsonPath('data.starred', true);
});

it('answers 404 for another workspace\'s issue', function (): void {
    ['issue' => $foreign] = starWorld();
    Workspace::forgetCurrent();
    ['token' => $token, 'workspace' => $ws] = starWorld();

    $this->withToken($token)
        ->withSession(['ensure_valid_tenant_session_tenant_id' => $ws->id])
        ->putJson("/v1/issues/{$foreign->id}/star")
        ->assertStatus(404);
    expect(IssueStar::query()->count())->toBe(0);
});

it('does not change the issue: no activity, no notification, updated_at untouched', function (): void {
    ['token' => $token, 'issue' => $issue] = starWorld();
    $updatedAt = $issue->fresh()->updated_at;
    $activities = IssueActivity::query()->where('issue_id', $issue->id)->count();
    $notifications = Notification::query()->count();
    $this->travel(5)->minutes();

    $this->withToken($token)->putJson("/v1/issues/{$issue->id}/star")->assertStatus(200);
    $this->withToken($token)->deleteJson("/v1/issues/{$issue->id}/star")->assertStatus(200);

    expect($issue->fresh()->updated_at->equalTo($updatedAt))->toBeTrue();
    expect(IssueActivity::query()->where('issue_id', $issue->id)->count())->toBe($activities);
    expect(Notification::query()->count())->toBe($notifications);
});

it('removes the star when the issue is hard-deleted (cascade)', function (): void {
    ['token' => $token, 'issue' => $issue] = starWorld();
    $this->withToken($token)->putJson("/v1/issues/{$issue->id}/star")->assertStatus(200);

    $issue->forceDelete();

    expect(IssueStar::query()->count())->toBe(0);
});
