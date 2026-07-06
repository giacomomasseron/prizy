<?php

declare(strict_types=1);

use App\Models\Issue;
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

it('sets (replaces) and lists the labels on an issue', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id]);
    $l1 = Label::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Bug', 'color' => '#ff0000']);
    $l2 = Label::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'UI', 'color' => '#00ff00']);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    $this->withToken($token)->putJson("/v1/issues/{$issue->id}/labels", ['label_ids' => [$l1->id, $l2->id]])->assertStatus(200);
    $this->assertDatabaseHas('issue_labels', ['issue_id' => $issue->id, 'label_id' => $l1->id]);

    $this->withToken($token)->getJson("/v1/issues/{$issue->id}/labels")->assertStatus(200)->assertJsonCount(2, 'data');

    // Replace-set: putting only l1 removes l2
    $this->withToken($token)->putJson("/v1/issues/{$issue->id}/labels", ['label_ids' => [$l1->id]])->assertStatus(200);
    $this->assertDatabaseMissing('issue_labels', ['issue_id' => $issue->id, 'label_id' => $l2->id]);

    Workspace::forgetCurrent();
});

it('rejects a label id from another workspace (422)', function (): void {
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();
    $labelB = Label::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $wsB->id, 'name' => 'B', 'color' => '#0000ff']);
    Workspace::forgetCurrent();

    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    $this->withToken($token)->putJson("/v1/issues/{$issue->id}/labels", ['label_ids' => [$labelB->id]])->assertStatus(422);

    Workspace::forgetCurrent();
});

it('rejects two labels from the same group and leaves the issue unchanged', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id]);
    $bug  = Label::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Bug',     'color' => '#ff0000', 'group' => 'Type']);
    $feat = Label::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Feature', 'color' => '#00ff00', 'group' => 'Type']);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    $this->withToken($token)->putJson("/v1/issues/{$issue->id}/labels", ['label_ids' => [$bug->id, $feat->id]])
        ->assertStatus(422)->assertJsonValidationErrorFor('label_ids');
    $this->assertDatabaseMissing('issue_labels', ['issue_id' => $issue->id]);
    Workspace::forgetCurrent();
});

it('allows one-per-group plus ungrouped labels', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id]);
    $type = Label::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Bug',      'color' => '#ff0000', 'group' => 'Type']);
    $sev  = Label::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Sev1',     'color' => '#e0894a', 'group' => 'Severity']);
    $free = Label::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'needs-qa', 'color' => '#5b8def', 'group' => null]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    $this->withToken($token)->putJson("/v1/issues/{$issue->id}/labels", ['label_ids' => [$type->id, $sev->id, $free->id]])
        ->assertStatus(200)->assertJsonCount(3, 'data');
    Workspace::forgetCurrent();
});
