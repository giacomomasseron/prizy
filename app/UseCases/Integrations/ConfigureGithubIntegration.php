<?php

declare(strict_types=1);

namespace App\UseCases\Integrations;

use App\Models\GithubIntegration;
use App\Models\User;
use App\Repositories\GithubIntegrationRepository;

final class ConfigureGithubIntegration
{
    public function __construct(private readonly GithubIntegrationRepository $repo) {}

    public function handle(User $actor, ?string $webhookSecret, bool $moveToDoneOnMerge, bool $isActive): GithubIntegration
    {
        $attributes = ['move_to_done_on_merge' => $moveToDoneOnMerge, 'is_active' => $isActive];
        if ($webhookSecret !== null) {
            $attributes['webhook_secret'] = $webhookSecret;
        }

        return $this->repo->upsert($attributes);
    }
}
