<?php

declare(strict_types=1);

namespace App\UseCases\Integrations;

use App\Models\SlackIntegration;
use App\Models\User;
use App\Repositories\SlackIntegrationRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method SlackIntegration run(User $actor, ?string $webhookUrl, array $events, bool $isActive)
 */
final class ConfigureSlackIntegration extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly SlackIntegrationRepository $repo) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @param array<int, string> $events */
    private function execute(User $actor, ?string $webhookUrl, array $events, bool $isActive): SlackIntegration
    {
        $attributes = ['events' => $events, 'is_active' => $isActive];
        if ($webhookUrl !== null) {
            $attributes['webhook_url'] = $webhookUrl;
        }

        return $this->repo->upsert($attributes);
    }
}
