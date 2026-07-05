<?php
declare(strict_types=1);

use App\Models\Issue;
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
function searchWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'admin_level' => 'owner', 'is_developer' => true]);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $token = app(CreatePersonalAccessToken::class)->handle($actor, 't', null)['token'];
    return [$token, $actor, $ws, $team];
}

function makeIssue(Workspace $ws, Team $team, User $creator, array $attrs = []): Issue
{
    return Issue::forceCreate(array_merge([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'team_id' => $team->id,
        'created_by' => $creator->id, 'title' => 'Issue', 'status' => 'todo', 'priority' => 'no_priority',
    ], $attrs));
}

it('defaults new issues to source=native', function (): void {
    [$token, $actor, $ws, $team] = searchWorld();
    $issue = makeIssue($ws, $team, $actor, ['title' => 'Native one']);
    expect($issue->fresh()->source)->toBe('native');
    Workspace::forgetCurrent();
});
