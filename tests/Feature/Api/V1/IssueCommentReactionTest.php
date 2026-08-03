<?php

declare(strict_types=1);

use App\Events\IssueCommented;
use App\Models\Issue;
use App\Models\IssueComment;
use App\Models\IssueCommentReaction;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\Repositories\IssueCommentReactionRepository;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{token:string, issue:Issue, comment:IssueComment, user:User, workspace:Workspace} */
function reactionWorld(array $userAttrs = ['is_developer' => true]): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $userAttrs));
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id]);
    $comment = IssueComment::create(['id' => (string) Str::uuid(), 'issue_id' => $issue->id, 'user_id' => $user->id, 'body' => 'hi']);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return ['token' => $token, 'issue' => $issue, 'comment' => $comment, 'user' => $user, 'workspace' => $ws];
}

afterEach(fn () => Workspace::forgetCurrent());

it('toggles a reaction on and off via the repository', function (): void {
    ['comment' => $comment, 'user' => $user] = reactionWorld();
    $repo = app(IssueCommentReactionRepository::class);

    $repo->toggle($comment->id, $user->id, '👀');
    expect(IssueCommentReaction::where('issue_comment_id', $comment->id)->count())->toBe(1);

    $repo->toggle($comment->id, $user->id, '👀'); // same → removed
    expect(IssueCommentReaction::where('issue_comment_id', $comment->id)->count())->toBe(0);
});

it('toggles a reaction via the endpoint and returns the comment with reactions', function (): void {
    ['token' => $token, 'issue' => $issue, 'comment' => $comment] = reactionWorld();
    $url = "/v1/issues/{$issue->id}/comments/{$comment->id}/reactions";

    $this->withToken($token)->postJson($url, ['emoji' => '👀'])
        ->assertStatus(200)
        ->assertJsonPath('data.reactions.0.emoji', '👀')
        ->assertJsonPath('data.reactions.0.count', 1)
        ->assertJsonPath('data.reactions.0.reacted', true);

    // toggle off
    $this->withToken($token)->postJson($url, ['emoji' => '👀'])
        ->assertStatus(200)
        ->assertJsonCount(0, 'data.reactions');
});

it('aggregates counts across users and marks reacted only for the caller', function (): void {
    ['token' => $token, 'issue' => $issue, 'comment' => $comment, 'workspace' => $ws] = reactionWorld();
    $other = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);
    $otherToken = app(CreatePersonalAccessToken::class)->handle($other, 't', null)['token'];
    $url = "/v1/issues/{$issue->id}/comments/{$comment->id}/reactions";

    $this->withToken($token)->postJson($url, ['emoji' => '🎯'])->assertStatus(200);
    $res = $this->withToken($otherToken)->postJson($url, ['emoji' => '🎯'])->assertStatus(200);
    expect($res->json('data.reactions.0.count'))->toBe(2);
    expect($res->json('data.reactions.0.reacted'))->toBeTrue(); // the caller (other) reacted

    // The list endpoint shows count 2 and reacted=true for the original caller
    $list = $this->withToken($token)->getJson("/v1/issues/{$issue->id}/comments")->assertStatus(200);
    expect($list->json('data.0.reactions.0.count'))->toBe(2);
    expect($list->json('data.0.reactions.0.reacted'))->toBeTrue();
});

it('rejects an invalid emoji (422)', function (): void {
    ['token' => $token, 'issue' => $issue, 'comment' => $comment] = reactionWorld();
    $this->withToken($token)->postJson("/v1/issues/{$issue->id}/comments/{$comment->id}/reactions", ['emoji' => '🍕'])
        ->assertStatus(422);
});

it('404s when the comment does not belong to the issue', function (): void {
    ['token' => $token, 'issue' => $issue] = reactionWorld();
    $this->withToken($token)->postJson("/v1/issues/{$issue->id}/comments/".Str::uuid().'/reactions', ['emoji' => '👀'])
        ->assertStatus(404);
});

it('forbids a member from another workspace (403/404)', function (): void {
    ['issue' => $issue, 'comment' => $comment] = reactionWorld();
    // A user in a DIFFERENT workspace cannot resolve/authorize this issue.
    $otherWs = Workspace::factory()->create();
    test()->actingInWorkspace($otherWs);
    $stranger = User::factory()->for($otherWs, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);
    $strangerToken = app(CreatePersonalAccessToken::class)->handle($stranger, 't', null)['token'];

    $this->withToken($strangerToken)
        ->withSession(['ensure_valid_tenant_session_tenant_id' => $otherWs->id])
        ->postJson("/v1/issues/{$issue->id}/comments/{$comment->id}/reactions", ['emoji' => '👀'])
        ->assertStatus(404); // FindIssue can't find it in the stranger's workspace
});

it('lets a non-developer member add a comment (authz relaxed to view)', function (): void {
    Event::fake([IssueCommented::class]); // avoid a real broadcast attempt (no Reverb service in tests)
    ['issue' => $issue, 'workspace' => $ws] = reactionWorld();
    $viewerDev = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => false]);
    $vToken = app(CreatePersonalAccessToken::class)->handle($viewerDev, 't', null)['token'];

    $this->withToken($vToken)->postJson("/v1/issues/{$issue->id}/comments", ['body' => 'me too'])
        ->assertStatus(201);
});

it('includes is_agent in the members list', function (): void {
    ['token' => $token] = reactionWorld();
    $this->withToken($token)->getJson('/v1/members')
        ->assertStatus(200)
        ->assertJsonPath('data.0.is_agent', false);
});
