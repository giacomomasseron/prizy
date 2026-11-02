<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\SetNotificationSubscriptionRequest;
use App\Http\Requests\Api\V1\UpdateNotificationPreferencesRequest;
use App\Http\Resources\NotificationResource;
use App\UseCases\Notifications\CountUnread;
use App\UseCases\Notifications\GetNotificationPreferences;
use App\UseCases\Notifications\GetNotificationSubscriptions;
use App\UseCases\Notifications\ListNotifications;
use App\UseCases\Notifications\MarkAllNotificationsRead;
use App\UseCases\Notifications\MarkNotificationRead;
use App\UseCases\Notifications\MarkNotificationUnread;
use App\UseCases\Notifications\SetNotificationSubscription;
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
        private readonly MarkNotificationRead $markNotificationRead,
        private readonly MarkNotificationUnread $markNotificationUnread,
        private readonly ToggleNotificationSnooze $toggleNotificationSnooze,
        private readonly ToggleNotificationArchive $toggleNotificationArchive,
        private readonly MarkAllNotificationsRead $markAllNotificationsRead,
        private readonly GetNotificationPreferences $getNotificationPreferences,
        private readonly UpdateNotificationPreferences $updateNotificationPreferences,
        private readonly GetNotificationSubscriptions $getNotificationSubscriptions,
        private readonly SetNotificationSubscription $setNotificationSubscription,
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

        return NotificationResource::collection($this->listNotifications->run($request->user(), $unreadOnly, $limit, $category))->response();
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json(['data' => ['count' => $this->countUnread->run($request->user())]]);
    }

    public function read(Request $request, string $notification): JsonResponse
    {
        $model = $this->markNotificationRead->run($request->user(), $notification);

        return NotificationResource::make($model)->response();
    }

    public function unread(Request $request, string $notification): JsonResponse
    {
        $model = $this->markNotificationUnread->run($request->user(), $notification);

        return NotificationResource::make($model)->response();
    }

    public function snooze(Request $request, string $notification): JsonResponse
    {
        $model = $this->toggleNotificationSnooze->run($request->user(), $notification);

        return NotificationResource::make($model)->response();
    }

    public function archive(Request $request, string $notification): JsonResponse
    {
        $model = $this->toggleNotificationArchive->run($request->user(), $notification);

        return NotificationResource::make($model)->response();
    }

    public function readAll(Request $request): Response
    {
        $this->markAllNotificationsRead->run($request->user());

        return response()->noContent();
    }

    public function preferences(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->getNotificationPreferences->run($request->user())]);
    }

    public function updatePreferences(UpdateNotificationPreferencesRequest $request): Response
    {
        $this->updateNotificationPreferences->run(
            $request->user(),
            $request->validated('email_digest_frequency'),
            $request->validated('preferences', []),
        );

        return response()->noContent();
    }

    public function subscriptions(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->getNotificationSubscriptions->run($request->user())]);
    }

    public function updateSubscription(SetNotificationSubscriptionRequest $request): Response
    {
        $this->setNotificationSubscription->run(
            $request->user(),
            $request->validated('scope_type'),
            $request->validated('scope_id'),
            $request->validated('level'),
        );

        return response()->noContent();
    }
}
