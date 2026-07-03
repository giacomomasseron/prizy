<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\Repositories\GithubIntegrationRepository;
use App\Repositories\GithubLinkRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('upserts one integration, generating a token and keeping the secret when omitted', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $repo = app(GithubIntegrationRepository::class);

    $created = $repo->upsert(['webhook_secret' => 's3cr3t', 'move_to_done_on_merge' => true, 'is_active' => true]);
    expect($created->webhook_token)->not->toBeEmpty();

    $updated = $repo->upsert(['move_to_done_on_merge' => false]);
    expect($updated->id)->toBe($created->id)
        ->and($updated->webhook_secret)->toBe('s3cr3t')          // kept
        ->and($updated->webhook_token)->toBe($created->webhook_token) // stable
        ->and($updated->move_to_done_on_merge)->toBeFalse();

    Workspace::forgetCurrent();
});

it('finds an integration by token', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $created = app(GithubIntegrationRepository::class)->upsert(['webhook_secret' => 'x']);
    $token = $created->webhook_token;
    Workspace::forgetCurrent();

    // No tenant current (landlord path) — the webhook resolves the workspace by token.
    $found = app(GithubIntegrationRepository::class)->findByToken($token);
    expect($found?->id)->toBe($created->id);
});

it('matches links by repo + number within the workspace', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $team = Team::factory()->for($ws, 'workspace')->create();
    $user = User::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->for($team)->create(['created_by' => $user->id]);
    $repo = app(GithubLinkRepository::class);

    $repo->create(['id' => Str::uuid()->toString(), 'issue_id' => $issue->id, 'repo' => 'acme/app', 'number' => 7, 'url' => 'https://github.com/acme/app/pull/7', 'created_by' => $user->id]);

    expect($repo->matching('acme/app', 7))->toHaveCount(1)
        ->and($repo->matching('acme/app', 999))->toHaveCount(0)
        ->and($repo->forIssue($issue->id))->toHaveCount(1);

    Workspace::forgetCurrent();
});
