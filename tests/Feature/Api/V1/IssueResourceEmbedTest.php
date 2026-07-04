<?php

declare(strict_types=1);

use App\Events\IssueAssigned;
use App\Events\IssueCreated;
use App\Events\NotificationCreated;
use App\Models\Issue;
use App\Models\Label;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

beforeEach(fn () => Event::fake([IssueCreated::class, IssueAssigned::class, NotificationCreated::class]));

/** @return array{0:string,1:Team,2:User,3:Workspace} */
function embedWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create([
        'email_verified_at' => now(),
        'is_developer'      => true,
        'admin_level'       => 'member',
    ]);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $token = app(CreatePersonalAccessToken::class)->handle($user, 'embed-test', null)['token'];

    return [$token, $team, $user, $ws];
}

it('IssueResource embeds labels array on GET /v1/issues', function (): void {
    [$token, $team, $user, $ws] = embedWorld();

    $issue = Issue::factory()->for($ws, 'workspace')->create([
        'team_id'    => $team->id,
        'created_by' => $user->id,
        'title'      => 'Embed labels test',
    ]);

    $label = Label::forceCreate([
        'id'           => (string) Str::uuid(),
        'workspace_id' => $ws->id,
        'name'         => 'Frontend',
        'color'        => '#4bab66',
    ]);

    $issue->labels()->attach($label->id);

    $res = $this->withToken($token)->getJson('/v1/issues');

    $res->assertStatus(200);

    $items = $res->json('data');
    $item  = collect($items)->firstWhere('id', $issue->id);

    expect($item)->toHaveKey('labels');
    expect($item['labels'])->toHaveCount(1);
    expect($item['labels'][0])->toMatchArray(['id' => $label->id, 'name' => 'Frontend', 'color' => '#4bab66']);

    Workspace::forgetCurrent();
});

it('IssueResource embeds assignee {id,name} on GET /v1/issues', function (): void {
    [$token, $team, $user, $ws] = embedWorld();

    $assignee = User::factory()->for($ws, 'workspace')->create(['name' => 'Jane Doe']);

    $issue = Issue::factory()->for($ws, 'workspace')->create([
        'team_id'     => $team->id,
        'created_by'  => $user->id,
        'assignee_id' => $assignee->id,
        'title'       => 'Assignee embed test',
    ]);

    $res = $this->withToken($token)->getJson('/v1/issues');

    $res->assertStatus(200);

    $items = $res->json('data');
    $item  = collect($items)->firstWhere('id', $issue->id);

    expect($item)->toHaveKey('assignee');
    expect($item['assignee'])->toMatchArray(['id' => $assignee->id, 'name' => 'Jane Doe']);

    Workspace::forgetCurrent();
});

it('IssueResource embeds assignee null for unassigned issue', function (): void {
    [$token, $team, $user, $ws] = embedWorld();

    $issue = Issue::factory()->for($ws, 'workspace')->create([
        'team_id'     => $team->id,
        'created_by'  => $user->id,
        'assignee_id' => null,
        'title'       => 'Unassigned test',
    ]);

    $res = $this->withToken($token)->getJson('/v1/issues');

    $res->assertStatus(200);

    $items = $res->json('data');
    $item  = collect($items)->firstWhere('id', $issue->id);

    expect($item)->toHaveKey('assignee');
    expect($item['assignee'])->toBeNull();

    Workspace::forgetCurrent();
});

it('POST /v1/issues with status=in_progress creates issue with that status', function (): void {
    [$token, $team] = embedWorld();

    $res = $this->withToken($token)->postJson('/v1/issues', [
        'team_id' => $team->id,
        'title'   => 'In-progress from create',
        'status'  => 'in_progress',
    ]);

    $res->assertStatus(201);
    expect($res->json('data.status'))->toBe('in_progress');

    $this->assertDatabaseHas('issues', [
        'title'  => 'In-progress from create',
        'status' => 'in_progress',
    ]);

    Workspace::forgetCurrent();
});
