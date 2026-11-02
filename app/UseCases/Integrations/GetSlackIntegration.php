<?php

declare(strict_types=1);

namespace App\UseCases\Integrations;

use App\Models\SlackIntegration;
use App\Models\User;
use App\Repositories\SlackIntegrationRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method ?SlackIntegration run(User $actor)
 */
final class GetSlackIntegration extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly SlackIntegrationRepository $repo) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    private function execute(User $actor): ?SlackIntegration
    {
        return $this->repo->forWorkspace();
    }
}
