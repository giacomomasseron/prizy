<?php

declare(strict_types=1);

use App\Models\GithubIntegration;
use App\Models\Issue;
use App\Models\IssueGithubLink;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0: Workspace, 1: GithubIntegration, 2: Issue, 3: IssueGithubLink, 4: string} */
function ghWebhookSetup(bool $moveOnMerge = true): array
{
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $team = Team::factory()->for($ws, 'workspace')->create();
    $user = User::factory()->for($ws, 'workspace')->create();
    $secret = 'webhook-secret-value';
    $integration = GithubIntegration::factory()->for($ws, 'workspace')->create(['webhook_secret' => $secret, 'move_to_done_on_merge' => $moveOnMerge]);
    $issue = Issue::factory()->for($ws, 'workspace')->for($team)->create(['status' => 'in_progress', 'created_by' => $user->id]);
    // Set issue_id explicitly (the project convention — IssueGithubLink has no issue() relation for ->for()).
    $link = IssueGithubLink::factory()->for($ws, 'workspace')->create(['issue_id' => $issue->id, 'repo' => 'acme/app', 'number' => 7, 'url' => 'https://github.com/acme/app/pull/7', 'created_by' => $user->id]);
    Workspace::forgetCurrent();

    return [$ws, $integration, $issue, $link, $secret];
}

function ghPost(string $token, array $payload, string $secret, string $event = 'pull_request'): Illuminate\Testing\TestResponse
{
    $body = json_encode($payload);
    $sig = 'sha256=' . hash_hmac('sha256', $body, $secret);

    return test()->call('POST', "/integrations/github/webhook/{$token}", [], [], [], [
        'CONTENT_TYPE' => 'application/json',
        'HTTP_X_HUB_SIGNATURE_256' => $sig,
        'HTTP_X_GITHUB_EVENT' => $event,
    ], $body);
}

it('moves the linked issue to done on a merged PR when the toggle is on', function (): void {
    [$ws, $integration, $issue, $link, $secret] = ghWebhookSetup(moveOnMerge: true);

    ghPost($integration->webhook_token, [
        'action' => 'closed',
        'pull_request' => ['merged' => true, 'number' => 7, 'title' => 'Fix it', 'html_url' => 'https://github.com/acme/app/pull/7'],
        'repository' => ['full_name' => 'acme/app'],
    ], $secret)->assertNoContent();

    $ws->makeCurrent();
    expect($issue->refresh()->status)->toBe('done')
        ->and($link->refresh()->state)->toBe('merged');
    Workspace::forgetCurrent();
});

it('updates link state but does not move the issue when the toggle is off', function (): void {
    [$ws, $integration, $issue, $link, $secret] = ghWebhookSetup(moveOnMerge: false);

    ghPost($integration->webhook_token, [
        'action' => 'closed',
        'pull_request' => ['merged' => true, 'number' => 7, 'title' => 't', 'html_url' => 'https://github.com/acme/app/pull/7'],
        'repository' => ['full_name' => 'acme/app'],
    ], $secret)->assertNoContent();

    $ws->makeCurrent();
    expect($issue->refresh()->status)->toBe('in_progress')
        ->and($link->refresh()->state)->toBe('merged');
    Workspace::forgetCurrent();
});

it('marks the link closed on a closed-unmerged PR without touching the issue', function (): void {
    [$ws, $integration, $issue, $link, $secret] = ghWebhookSetup();

    ghPost($integration->webhook_token, [
        'action' => 'closed',
        'pull_request' => ['merged' => false, 'number' => 7, 'title' => 't', 'html_url' => 'https://github.com/acme/app/pull/7'],
        'repository' => ['full_name' => 'acme/app'],
    ], $secret)->assertNoContent();

    $ws->makeCurrent();
    expect($issue->refresh()->status)->toBe('in_progress')
        ->and($link->refresh()->state)->toBe('closed');
    Workspace::forgetCurrent();
});

it('rejects a bad signature (401) and an unknown token (404)', function (): void {
    [$ws, $integration, $issue, $link, $secret] = ghWebhookSetup();
    $body = json_encode(['action' => 'closed', 'pull_request' => ['merged' => true, 'number' => 7], 'repository' => ['full_name' => 'acme/app']]);

    // wrong signature
    test()->call('POST', "/integrations/github/webhook/{$integration->webhook_token}", [], [], [], [
        'HTTP_X_HUB_SIGNATURE_256' => 'sha256=deadbeef', 'HTTP_X_GITHUB_EVENT' => 'pull_request',
    ], $body)->assertStatus(401);

    // unknown token
    ghPost('nonexistent-token', ['action' => 'closed', 'pull_request' => ['merged' => true, 'number' => 7], 'repository' => ['full_name' => 'acme/app']], $secret)->assertStatus(404);
});

it('no-ops (204) for a PR with no matching link and is workspace-scoped', function (): void {
    [$ws, $integration, $issue, $link, $secret] = ghWebhookSetup();

    ghPost($integration->webhook_token, [
        'action' => 'closed',
        'pull_request' => ['merged' => true, 'number' => 999, 'title' => 't', 'html_url' => 'https://github.com/acme/app/pull/999'],
        'repository' => ['full_name' => 'acme/app'],
    ], $secret)->assertNoContent();

    $ws->makeCurrent();
    expect($issue->refresh()->status)->toBe('in_progress'); // untouched — no matching link
    Workspace::forgetCurrent();
});
