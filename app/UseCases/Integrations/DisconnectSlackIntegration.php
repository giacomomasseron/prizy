<?php

declare(strict_types=1);

namespace App\UseCases\Integrations;

use App\Models\User;
use App\Repositories\SlackIntegrationRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method void run(User $actor)
 */
final class DisconnectSlackIntegration extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly SlackIntegrationRepository $repo) {}

    public function handle(mixed ...$arguments): mixed
    {
        $this->execute(...$arguments);

        return null;
    }

    private function execute(User $actor): void
    {
        $this->repo->deleteForWorkspace();
    }
}
