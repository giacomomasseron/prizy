<?php

declare(strict_types=1);

use App\Models\Cycle;
use App\Models\Issue;
use App\Models\IssueLabel;
use App\Models\Label;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:string,1:Workspace,2:Team,3:User} */
function filterWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws, $team, $user];
}

it('filters issues by label_id (has any of the given labels)', function (): void {
    [$token, $ws, $team, $user] = filterWorld();
    $label = Label::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Bug', 'color' => '#ff0000']);
    $labelled = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id]);
    $plain = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id]);
    IssueLabel::create(['issue_id' => $labelled->id, 'label_id' => $label->id]);

    $res = $this->withToken($token)->getJson("/v1/issues?filter[label_id]={$label->id}");
    $res->assertStatus(200);
    $ids = array_column($res->json('data'), 'id');
    expect($ids)->toContain($labelled->id)->not->toContain($plain->id);

    Workspace::forgetCurrent();
});

it('filters issues by cycle_id=active (currently-active cycles only)', function (): void {
    [$token, $ws, $team, $user] = filterWorld();
    $active = Cycle::create(['id' => (string) Str::uuid(), 'team_id' => $team->id, 'name' => 'Now', 'starts_at' => now()->subDay()->toDateString(), 'ends_at' => now()->addDay()->toDateString()]);
    $past = Cycle::create(['id' => (string) Str::uuid(), 'team_id' => $team->id, 'name' => 'Past', 'starts_at' => now()->subDays(10)->toDateString(), 'ends_at' => now()->subDays(3)->toDateString()]);
    $inActive = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id, 'cycle_id' => $active->id]);
    $inPast = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id, 'cycle_id' => $past->id]);

    $res = $this->withToken($token)->getJson('/v1/issues?filter[cycle_id]=active');
    $res->assertStatus(200);
    $ids = array_column($res->json('data'), 'id');
    expect($ids)->toContain($inActive->id)->not->toContain($inPast->id);

    Workspace::forgetCurrent();
});
