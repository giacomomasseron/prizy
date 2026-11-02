<?php

declare(strict_types=1);

namespace App\UseCases\Notifications;

use App\Models\User;
use App\Repositories\NotificationPreferenceRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method array run(User $actor)
 */
final class GetNotificationPreferences extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly NotificationPreferenceRepository $preferences) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /**
     * @return array{
     *     email_digest_frequency: string,
     *     preferences: array<int, array{event_type: string, in_app: bool, email: bool}>,
     * }
     */
    private function execute(User $actor): array
    {
        return [
            'email_digest_frequency' => $actor->email_digest_frequency,
            'preferences' => $this->preferences->matrixFor($actor->id),
        ];
    }
}
