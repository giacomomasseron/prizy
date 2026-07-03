<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\IssueAssigned;
use App\Events\IssueCommented;
use App\Events\IssueCreated;
use App\Events\IssueStatusChanged;
use App\Jobs\SendSlackMessage;
use App\Models\Issue;
use App\Models\Workspace;
use App\Repositories\SlackIntegrationRepository;
use App\Support\Integrations\SlackMessageText;
use Illuminate\Events\Dispatcher;

final class PostIssueEventToSlack
{
    public function __construct(private readonly SlackIntegrationRepository $repo) {}

    public function subscribe(Dispatcher $events): void
    {
        $events->listen(IssueCreated::class, [self::class, 'handleCreated']);
        $events->listen(IssueStatusChanged::class, [self::class, 'handleStatusChanged']);
        $events->listen(IssueAssigned::class, [self::class, 'handleAssigned']);
        $events->listen(IssueCommented::class, [self::class, 'handleCommented']);
    }

    public function handleCreated(IssueCreated $event): void
    {
        $this->post($event->issue, 'created');
    }

    public function handleStatusChanged(IssueStatusChanged $event): void
    {
        $this->post($event->issue, 'status_changed', $event->to);
    }

    public function handleAssigned(IssueAssigned $event): void
    {
        $this->post($event->issue, 'assigned');
    }

    public function handleCommented(IssueCommented $event): void
    {
        $this->post($event->issue, 'commented');
    }

    private function post(Issue $issue, string $key, ?string $status = null): void
    {
        $integration = $this->repo->forWorkspace();

        if ($integration === null || ! $integration->is_active || $integration->webhook_url === null || ! in_array($key, $integration->events, true)) {
            return;
        }

        $slug = Workspace::current()?->slug ?? '';
        $url = SlackMessageText::url($slug, $issue->id);
        $text = SlackMessageText::build($key, $issue->title, $url, $status);

        SendSlackMessage::dispatch($integration->webhook_url, $text);
    }
}
