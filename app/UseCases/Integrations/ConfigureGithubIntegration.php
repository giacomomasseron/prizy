<?php

declare(strict_types=1);

namespace App\UseCases\Integrations;

use App\Models\GithubIntegration;
use App\Models\User;
use App\Repositories\GithubIntegrationRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method GithubIntegration run(User $actor, ?string $webhookSecret, bool $moveToDoneOnMerge, bool $isActive)
 */
final class ConfigureGithubIntegration extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly GithubIntegrationRepository $repo) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    private function execute(User $actor, ?string $webhookSecret, bool $moveToDoneOnMerge, bool $isActive): GithubIntegration
    {
        $attributes = ['move_to_done_on_merge' => $moveToDoneOnMerge, 'is_active' => $isActive];
        if ($webhookSecret !== null) {
            $attributes['webhook_secret'] = $webhookSecret;
        }

        return $this->repo->upsert($attributes);
    }
}
