<?php

declare(strict_types=1);

namespace App\UseCases\Integrations;

use App\Models\User;
use App\Repositories\GithubIntegrationRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method static void run(User $actor)
 */
final class DisconnectGithubIntegration extends BaseUseCase implements UseCaseInterface
{
    private readonly GithubIntegrationRepository $repo;

    public function handle(mixed ...$arguments): mixed
    {
        $this->repo = app(GithubIntegrationRepository::class);

        $this->execute(...$arguments);

        return null;
    }

    private function execute(User $actor): void
    {
        $this->repo->deleteForWorkspace();
    }
}
