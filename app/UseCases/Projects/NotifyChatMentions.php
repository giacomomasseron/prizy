<?php

declare(strict_types=1);

namespace App\UseCases\Projects;

use App\Events\NotificationCreated;
use App\Models\Project;
use App\Models\ProjectMessage;
use App\Models\User;
use App\Repositories\NotificationRepository;
use App\Services\NotificationRecipients;
use App\UseCases\Notifications\NotificationDispatcher;

/**
 * The `project_mentioned` notifications for a chat message (PRD §3.2.11). The people the message mentions (full
 * name, first name or email, at a token boundary — the issue comments' rules) are notified, except the author,
 * anyone who can't open the project (no tracker access), and — after an edit — anyone already notified for this
 * message. Runs inside the caller's transaction; returns the NotificationCreated events to fire after commit.
 */
final class NotifyChatMentions
{
    public function __construct(
        private readonly NotificationDispatcher $dispatcher,
        private readonly NotificationRecipients $recipients,
        private readonly NotificationRepository $notifications,
    ) {}

    /** @return list<NotificationCreated> */
    public function handle(User $actor, Project $project, ProjectMessage $message): array
    {
        // Only tracker users can open a project chat: developers and the owner.
        $members = User::where('workspace_id', $actor->workspace_id)
            ->where(fn ($q) => $q->where('is_developer', true)->orWhere('admin_level', 'owner'))
            ->select(['id', 'name', 'email'])
            ->withoutTrashed()
            ->get();
        $already = $this->notifications->recipientsOf('project_mentioned', 'project_message', $message->id);
        $excerpt = $this->excerpt($message->body);

        $events = [];
        foreach ($this->recipients->mentioned($message->body, $members, $actor->id) as $userId) {
            if (in_array($userId, $already, true)) {
                continue;
            }
            $notification = $this->dispatcher->dispatch($userId, 'project_mentioned', 'project_message', $message->id, $actor->id, $excerpt, $project->team_id, $project->id);
            if ($notification !== null) {
                $events[] = new NotificationCreated($userId, $notification->id, 'project_mentioned');
            }
        }

        return $events;
    }

    private function excerpt(string $body): string
    {
        $trimmed = trim($body);

        return mb_strlen($trimmed) <= 140 ? $trimmed : mb_substr($trimmed, 0, 140).'…';
    }
}
