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

it('shows a single issue', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id, 'title' => 'Z']);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    $res = $this->withToken($token)->getJson("/v1/issues/{$issue->id}");

    $res->assertStatus(200)->assertJson(['data' => ['id' => $issue->id, 'title' => 'Z']]);

    Workspace::forgetCurrent();
});

it('returns 404 problem+json for a missing/cross-workspace issue', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    $res = $this->withToken($token)->getJson('/v1/issues/' . Str::uuid());

    $res->assertStatus(404);
    expect($res->headers->get('content-type'))->toContain('application/problem+json');

    Workspace::forgetCurrent();
});
