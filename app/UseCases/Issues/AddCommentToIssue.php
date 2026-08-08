<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Events\IssueCommented;
use App\Events\NotificationCreated;
use App\Models\Issue;
use App\Models\IssueComment;
use App\Models\User;
use App\Repositories\IssueCommentRepository;
use App\Repositories\IssueRepository;
use App\Repositories\NotificationRepository;
use App\Services\NotificationRecipients;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class AddCommentToIssue
{
    public function __construct(
        private readonly IssueRepository $issues,
        private readonly IssueCommentRepository $comments,
        private readonly NotificationRepository $notifications,
        private readonly NotificationRecipients $recipients,
    ) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): IssueComment
    {
        $issue = $this->issues->findInWorkspace((string) $data['issue_id']);

        if ($issue === null) {
            throw ValidationException::withMessages(['issue_id' => ['The selected issue is invalid.']]);
        }

        $body = (string) $data['body'];

        /** @var list<NotificationCreated> $notificationEvents */
        $notificationEvents = [];

        $comment = DB::transaction(function () use ($issue, $actor, $body, $data, &$notificationEvents): IssueComment {
            $comment = $this->comments->create([
                'issue_id' => $issue->id,
                'user_id' => $actor->id,
                'body' => $body,
                'is_internal' => (bool) ($data['is_internal'] ?? false),
            ]);

            $notificationEvents = $this->notifyParticipants($issue, $actor, $body);

            return $comment;
        });

        event(new IssueCommented($issue, $comment));

        foreach ($notificationEvents as $notificationEvent) {
            event($notificationEvent);
        }

        return $comment;
    }

    /** @return list<NotificationCreated> */
    private function notifyParticipants(Issue $issue, User $actor, string $body): array
    {
        $excerpt = $this->excerpt($body);

        $members = User::where('workspace_id', $actor->workspace_id)
            ->select(['id', 'name', 'email'])
            ->withoutTrashed()
            ->get();

        $events = [];

        $mentions = $this->recipients->mentioned($body, $members, $actor->id);
        foreach ($mentions as $userId) {
            $notification = $this->notifications->create($userId, 'issue_mentioned', 'issue', $issue->id, $actor->id, $excerpt);
            $events[] = new NotificationCreated($userId, $notification->id, 'issue_mentioned');
        }

        // A mentioned participant gets the mention notification only, never
        // also a comment notification.
        $others = array_values(array_diff($this->recipients->participants($issue, $actor->id), $mentions));
        foreach ($others as $userId) {
            $notification = $this->notifications->create($userId, 'issue_commented', 'issue', $issue->id, $actor->id, $excerpt);
            $events[] = new NotificationCreated($userId, $notification->id, 'issue_commented');
        }

        return $events;
    }

    private function excerpt(string $body): string
    {
        $trimmed = trim($body);

        if (mb_strlen($trimmed) <= 140) {
            return $trimmed;
        }

        return mb_substr($trimmed, 0, 140).'…';
    }
}
