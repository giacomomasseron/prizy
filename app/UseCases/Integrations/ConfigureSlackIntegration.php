<?php

declare(strict_types=1);

namespace App\UseCases\Integrations;

use App\Models\SlackIntegration;
use App\Models\User;
use App\Repositories\SlackIntegrationRepository;

final class ConfigureSlackIntegration
{
    public function __construct(private readonly SlackIntegrationRepository $repo) {}

    /** @param array<int, string> $events */
    public function handle(User $actor, ?string $webhookUrl, array $events, bool $isActive): SlackIntegration
    {
        $attributes = ['events' => $events, 'is_active' => $isActive];
        if ($webhookUrl !== null) {
            $attributes['webhook_url'] = $webhookUrl;
        }

        return $this->repo->upsert($attributes);
    }
}
