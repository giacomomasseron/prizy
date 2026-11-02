<?php

declare(strict_types=1);

namespace App\UseCases\Notifications;

use App\Models\User;
use App\Repositories\NotificationPreferenceRepository;
use App\Repositories\NotificationRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method static void run(User $actor, ?string $frequency, array $preferences = [])
 */
final class UpdateNotificationPreferences extends BaseUseCase implements UseCaseInterface
{
    private readonly NotificationRepository $notifications;

    private readonly NotificationPreferenceRepository $preferences;

    public function handle(mixed ...$arguments): mixed
    {
        $this->notifications = app(NotificationRepository::class);
        $this->preferences = app(NotificationPreferenceRepository::class);

        $this->execute(...$arguments);

        return null;
    }

    /** @param array<int, array{event_type: string, channel: string, enabled: bool}> $preferences */
    private function execute(User $actor, ?string $frequency, array $preferences = []): void
    {
        if ($frequency !== null) {
            $this->notifications->setDigestFrequency($actor, $frequency);
        }

        foreach ($preferences as $preference) {
            $this->preferences->setPreference(
                $actor->id,
                $preference['event_type'],
                $preference['channel'],
                (bool) $preference['enabled'],
            );
        }
    }
}
