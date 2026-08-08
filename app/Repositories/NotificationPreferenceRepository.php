<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\NotificationPreference;

final class NotificationPreferenceRepository
{
    public const EVENT_TYPES = ['mention', 'assign', 'comment', 'status', 'unblocked'];

    public const CHANNELS = ['in_app', 'email'];

    public const TYPE_TO_EVENT = [
        'issue_mentioned' => 'mention',
        'issue_assigned' => 'assign',
        'issue_commented' => 'comment',
        'issue_status_changed' => 'status',
        'issue_unblocked' => 'unblocked',
    ];

    public const DEFAULTS = [
        'mention' => ['in_app' => true, 'email' => true],
        'assign' => ['in_app' => true, 'email' => true],
        'comment' => ['in_app' => true, 'email' => false],
        'status' => ['in_app' => true, 'email' => false],
        'unblocked' => ['in_app' => true, 'email' => false],
    ];

    /** Stored override wins; otherwise fall back to the code default for the event/channel pair. */
    public function wants(string $userId, string $eventType, string $channel): bool
    {
        $row = NotificationPreference::query()
            ->where('user_id', $userId)
            ->where('event_type', $eventType)
            ->where('channel', $channel)
            ->first();

        if ($row !== null) {
            return (bool) $row->enabled;
        }

        return self::DEFAULTS[$eventType][$channel] ?? true;
    }

    /** @return array<int, array{event_type: string, in_app: bool, email: bool}> */
    public function matrixFor(string $userId): array
    {
        return array_map(
            fn (string $eventType): array => [
                'event_type' => $eventType,
                'in_app' => $this->wants($userId, $eventType, 'in_app'),
                'email' => $this->wants($userId, $eventType, 'email'),
            ],
            self::EVENT_TYPES,
        );
    }

    /**
     * Event-category keys with the `email` channel disabled for this user
     * (stored override wins; otherwise the code default). One query.
     *
     * @return list<string>
     */
    public function emailDisabledEventTypes(string $userId): array
    {
        $overrides = NotificationPreference::query()
            ->where('user_id', $userId)
            ->where('channel', 'email')
            ->pluck('enabled', 'event_type');

        return array_values(array_filter(
            self::EVENT_TYPES,
            fn (string $eventType): bool => $overrides->has($eventType)
                ? ! (bool) $overrides->get($eventType)
                : ! (self::DEFAULTS[$eventType]['email'] ?? true),
        ));
    }

    /** workspace_id is auto-filled from the active tenant by BelongsToWorkspace; id is auto-filled on create by the model. */
    public function setPreference(string $userId, string $eventType, string $channel, bool $enabled): void
    {
        NotificationPreference::updateOrCreate(
            ['user_id' => $userId, 'event_type' => $eventType, 'channel' => $channel],
            ['enabled' => $enabled],
        );
    }
}
