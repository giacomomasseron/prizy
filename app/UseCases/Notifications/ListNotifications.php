<?php

declare(strict_types=1);

namespace App\UseCases\Notifications;

use App\Models\User;
use App\Repositories\NotificationRepository;
use Illuminate\Pagination\CursorPaginator;

final class ListNotifications
{
    public function __construct(private readonly NotificationRepository $notifications) {}

    public function handle(User $actor, bool $unreadOnly, int $limit): CursorPaginator
    {
        return $this->notifications->paginateForUser($actor->id, $unreadOnly, $limit);
    }
}
