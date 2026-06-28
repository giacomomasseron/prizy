<?php

declare(strict_types=1);

use App\Events\IssueCommented;
use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Issues\AddCommentToIssue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Validation\ValidationException;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('adds a comment and broadcasts IssueCommented', function (): void {
    Event::fake([IssueCommented::class]);
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $team  = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $actor->id]);

    $comment = app(AddCommentToIssue::class)->handle($actor, [
        'issue_id' => $issue->id, 'body' => 'Looks good', 'is_internal' => true,
    ]);

    $this->assertDatabaseHas('issue_comments', [
        'id' => $comment->id, 'issue_id' => $issue->id, 'user_id' => $actor->id, 'body' => 'Looks good', 'is_internal' => true,
    ]);
    $this->assertDatabaseMissing('issue_activities', ['issue_id' => $issue->id, 'type' => 'commented']);
    Event::assertDispatched(IssueCommented::class, fn (IssueCommented $e): bool => $e->comment->id === $comment->id);

    Workspace::forgetCurrent();
});

it('rejects commenting on an issue from another workspace', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create();

    expect(fn () => app(AddCommentToIssue::class)->handle($actor, ['issue_id' => (string) \Illuminate\Support\Str::uuid(), 'body' => 'x']))
        ->toThrow(ValidationException::class);

    Workspace::forgetCurrent();
});
