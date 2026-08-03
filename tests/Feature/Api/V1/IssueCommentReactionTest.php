<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\IssueComment;
use App\Models\IssueCommentReaction;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\Repositories\IssueCommentReactionRepository;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
