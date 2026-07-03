<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

function ghLinkSetup(string $level): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $user = User::factory()->for($ws, 'workspace')->create(['admin_level' => $level, 'is_developer' => $level !== 'viewer', 'email_verified_at' => now()]);
    $issue = Issue::factory()->for($ws, 'workspace')->for($team)->create(['created_by' => $user->id]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$ws, $issue, $token];
}

it('adds, lists and removes a PR link', function (): void {
    [$ws, $issue, $token] = ghLinkSetup('admin');

    $created = $this->withToken($token)->postJson("/v1/issues/{$issue->id}/github-links", ['url' => 'https://github.com/acme/app/pull/7'])
        ->assertCreated()->assertJsonPath('data.repo', 'acme/app')->assertJsonPath('data.number', 7)->json('data.id');

    $this->withToken($token)->getJson("/v1/issues/{$issue->id}/github-links")->assertOk()->assertJsonCount(1, 'data');
    $this->withToken($token)->deleteJson("/v1/issues/{$issue->id}/github-links/{$created}")->assertNoContent();
    $this->withToken($token)->getJson("/v1/issues/{$issue->id}/github-links")->assertJsonCount(0, 'data');

    Workspace::forgetCurrent();
});

it('rejects a non-PR url and a duplicate (422)', function (): void {
    [$ws, $issue, $token] = ghLinkSetup('admin');

    $this->withToken($token)->postJson("/v1/issues/{$issue->id}/github-links", ['url' => 'https://github.com/acme/app/issues/7'])->assertStatus(422);
    $this->withToken($token)->postJson("/v1/issues/{$issue->id}/github-links", ['url' => 'https://github.com/acme/app/pull/7'])->assertCreated();
    $this->withToken($token)->postJson("/v1/issues/{$issue->id}/github-links", ['url' => 'https://github.com/acme/app/pull/7'])->assertStatus(422); // duplicate

    Workspace::forgetCurrent();
});

it('forbids a viewer from adding a link (403)', function (): void {
    [$ws, $issue, $token] = ghLinkSetup('viewer');

    $this->withToken($token)->postJson("/v1/issues/{$issue->id}/github-links", ['url' => 'https://github.com/acme/app/pull/7'])->assertStatus(403);

    Workspace::forgetCurrent();
});

it('accepts a PR url longer than 255 chars and stores it (201)', function (): void {
    [$ws, $issue, $token] = ghLinkSetup('admin');
    // Build a URL >255 chars using a query-string suffix so that the extracted owner/repo
    // stays short (VARCHAR(255) is fine) while the stored url column needs VARCHAR(2048).
    $longUrl = 'https://github.com/owner/repo/pull/1?' . str_repeat('x', 220);

    $created = $this->withToken($token)->postJson("/v1/issues/{$issue->id}/github-links", ['url' => $longUrl])
        ->assertCreated()->json('data');

    expect($created['url'])->toBe($longUrl)
        ->and($created['number'])->toBe(1);

    Workspace::forgetCurrent();
});
