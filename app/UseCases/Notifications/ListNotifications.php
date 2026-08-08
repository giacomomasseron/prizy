<?php

declare(strict_types=1);

namespace App\UseCases\Notifications;

use App\Models\Notification;
use App\Models\User;
use App\Repositories\IssueRepository;
use App\Repositories\NotificationRepository;
use Illuminate\Pagination\CursorPaginator;

final class ListNotifications
{
    public function __construct(
        private readonly NotificationRepository $notifications,
        private readonly IssueRepository $issues,
    ) {}

    public function handle(User $actor, bool $unreadOnly, int $limit, string $category = 'all'): CursorPaginator
    {
        $paginator = $this->notifications->paginateForUser($actor->id, $unreadOnly, $limit, $category);

        // Batch-resolve 'issue' subjects for the page in a SINGLE query and cache the result
        // on each model's `subject` relation, so the resource never queries per-row (no N+1).
        $issueIds = $paginator->getCollection()
            ->where('subject_type', 'issue')
            ->pluck('subject_id')
            ->unique()
            ->values()
            ->all();

        $issuesById = $this->issues->findManyByIds($issueIds);

        $paginator->getCollection()->each(function (Notification $notification) use ($issuesById): void {
            $notification->setRelation(
                'subject',
                $notification->subject_type === 'issue' ? $issuesById->get($notification->subject_id) : null,
            );
        });

        return $paginator;
    }
}
