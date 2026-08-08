<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\UpdateNotificationPreferencesRequest;
use App\Http\Resources\NotificationResource;
use App\UseCases\Notifications\CountUnread;
use App\UseCases\Notifications\GetNotificationPreferences;
use App\UseCases\Notifications\ListNotifications;
use App\UseCases\Notifications\MarkAllNotificationsRead;
use App\UseCases\Notifications\MarkNotificationRead;
use App\UseCases\Notifications\MarkNotificationUnread;
use App\UseCases\Notifications\ToggleNotificationArchive;
use App\UseCases\Notifications\ToggleNotificationSnooze;
use App\UseCases\Notifications\UpdateNotificationPreferences;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

final class NotificationController extends Controller
{
    private const CATEGORIES = ['all', 'mention', 'assign', 'support', 'snoozed', 'archived'];

    public function __construct(
        private readonly ListNotifications $listNotifications,
        private readonly CountUnread $countUnread,
        private readonly MarkNotificationRead $markRead,
        private readonly MarkNotificationUnread $markUnread,
        private readonly ToggleNotificationSnooze $toggleSnooze,
        private readonly ToggleNotificationArchive $toggleArchive,
        private readonly MarkAllNotificationsRead $markAllRead,
        private readonly UpdateNotificationPreferences $updatePreferencesUseCase,
        private readonly GetNotificationPreferences $getPreferencesUseCase,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'filter.category' => ['sometimes', Rule::in(self::CATEGORIES)],
        ]);

        /** @var array<string, mixed> $filter */
        $filter = (array) $request->query('filter', []);
        $unreadOnly = ($filter['unread'] ?? null) === 'true';
        $category = is_string($filter['category'] ?? null) ? $filter['category'] : 'all';
        $limit = min(max((int) $request->query('limit', '25'), 1), 100);

        return NotificationResource::collection($this->listNotifications->handle($request->user(), $unreadOnly, $limit, $category))->response();
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

    public function unread(Request $request, string $notification): JsonResponse
    {
        $model = $this->markUnread->handle($request->user(), $notification);

        return NotificationResource::make($model)->response();
    }

    public function snooze(Request $request, string $notification): JsonResponse
    {
        $model = $this->toggleSnooze->handle($request->user(), $notification);

        return NotificationResource::make($model)->response();
    }

    public function archive(Request $request, string $notification): JsonResponse
    {
        $model = $this->toggleArchive->handle($request->user(), $notification);

        return NotificationResource::make($model)->response();
    }

    public function readAll(Request $request): Response
    {
        $this->markAllRead->handle($request->user());

        return response()->noContent();
    }

    public function preferences(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->getPreferencesUseCase->handle($request->user())]);
    }

    public function updatePreferences(UpdateNotificationPreferencesRequest $request): Response
    {
        $this->updatePreferencesUseCase->handle(
            $request->user(),
            $request->validated('email_digest_frequency'),
            $request->validated('preferences', []),
        );

        return response()->noContent();
    }
}
