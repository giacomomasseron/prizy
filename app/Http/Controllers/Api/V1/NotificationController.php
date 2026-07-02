<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\UseCases\Notifications\CountUnread;
use App\UseCases\Notifications\ListNotifications;
use App\UseCases\Notifications\MarkAllNotificationsRead;
use App\UseCases\Notifications\MarkNotificationRead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class NotificationController extends Controller
{
    public function __construct(
        private readonly ListNotifications $listNotifications,
        private readonly CountUnread $countUnread,
        private readonly MarkNotificationRead $markRead,
        private readonly MarkAllNotificationsRead $markAllRead,
    ) {}

    public function index(Request $request): JsonResponse
    {
        /** @var array<string, mixed> $filter */
        $filter = (array) $request->query('filter', []);
        $unreadOnly = ($filter['unread'] ?? null) === 'true';
        $limit = min(max((int) $request->query('limit', '25'), 1), 100);

        return NotificationResource::collection($this->listNotifications->handle($request->user(), $unreadOnly, $limit))->response();
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json(['data' => ['count' => $this->countUnread->handle($request->user())]]);
    }

    public function read(Request $request, string $notification): JsonResponse
    {
        $model = $this->markRead->handle($request->user(), $notification);

        return NotificationResource::make($model)->response();
    }

    public function readAll(Request $request): Response
    {
        $this->markAllRead->handle($request->user());

        return response()->noContent();
    }
}
