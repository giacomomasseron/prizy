<?php

declare(strict_types=1);

namespace App\Support\Integrations;

use App\Models\IssueGithubLink;
use App\Models\User;
use App\Models\Workspace;
use App\Repositories\GithubIntegrationRepository;
use App\Repositories\GithubLinkRepository;
use App\Repositories\IssueRepository;
use App\UseCases\Issues\TransitionIssueStatus;

/**
 * Orchestrates an inbound GitHub webhook. Lives in app/Support (an uncovered deptrac
 * layer) because it must call TransitionIssueStatus (a UseCase) + repositories + models,
 * which a covered UseCase/Service cannot.
 */
final class GithubWebhookHandler
{
    public function __construct(
        private readonly GithubIntegrationRepository $integrations,
        private readonly GithubLinkRepository $links,
        private readonly IssueRepository $issues,
        private readonly TransitionIssueStatus $transition,
    ) {}

    public function handle(string $token, string $rawBody, ?string $signature, ?string $event): string
    {
        $integration = $this->integrations->findByToken($token);
        if ($integration === null || ! $integration->is_active) {
            return 'not_found';
        }

        $secret = $integration->webhook_secret;
        if ($secret === null || $signature === null) {
            return 'invalid_signature';
        }
        $expected = 'sha256=' . hash_hmac('sha256', $rawBody, $secret);
        if (! hash_equals($expected, $signature)) {
            return 'invalid_signature';
        }

        if ($event !== 'pull_request') {
            return 'ignored';
        }

        /** @var array<string, mixed> $payload */
        $payload = json_decode($rawBody, true);
        if (! is_array($payload)) {
            return 'ignored';
        }

        $action = (string) ($payload['action'] ?? '');
        $pr = is_array($payload['pull_request'] ?? null) ? $payload['pull_request'] : [];
        $repo = (string) ($payload['repository']['full_name'] ?? '');
        $number = (int) ($pr['number'] ?? 0);
        $merged = (bool) ($pr['merged'] ?? false);
        $title = isset($pr['title']) ? (string) $pr['title'] : null;

        $workspace = Workspace::find($integration->workspace_id);
        if ($workspace === null) {
            return 'ignored';
        }

        $workspace->makeCurrent();
        try {
            $state = $action === 'closed' ? ($merged ? 'merged' : 'closed') : 'open';
            foreach ($this->links->matching($repo, $number) as $link) {
                $link->update(['state' => $state, 'title' => $title]);
                if ($state === 'merged' && $integration->move_to_done_on_merge) {
                    $this->moveToDone($link);
                }
            }
        } finally {
            Workspace::forgetCurrent();
        }

        return 'ok';
    }

    private function moveToDone(IssueGithubLink $link): void
    {
        $issue = $this->issues->findInWorkspace($link->issue_id);
        if ($issue === null || $issue->status === 'done') {
            return;
        }
        $actor = User::find($link->created_by);
        if ($actor === null) {
            return;
        }
        try {
            $this->transition->handle($actor, ['issue_id' => $link->issue_id, 'status' => 'done']);
        } catch (\Throwable) {
            // A disallowed transition must not fail the whole webhook.
        }
    }
}
