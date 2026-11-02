<?php

declare(strict_types=1);

namespace App\UseCases\Integrations;

use App\Models\GithubIntegration;
use App\Models\User;
use App\Repositories\GithubIntegrationRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method static ?GithubIntegration run(User $actor)
 */
final class GetGithubIntegration extends BaseUseCase implements UseCaseInterface
{
    private readonly GithubIntegrationRepository $repo;

    public function handle(mixed ...$arguments): mixed
    {
        $this->repo = app(GithubIntegrationRepository::class);

        return $this->execute(...$arguments);
    }

    private function execute(User $actor): ?GithubIntegration
    {
        return $this->repo->forWorkspace();
    }
}
