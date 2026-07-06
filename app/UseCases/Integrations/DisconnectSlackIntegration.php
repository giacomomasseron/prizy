<?php

declare(strict_types=1);

namespace App\UseCases\Integrations;

use App\Models\User;
use App\Repositories\SlackIntegrationRepository;

final class DisconnectSlackIntegration
{
    public function __construct(private readonly SlackIntegrationRepository $repo) {}

    public function handle(User $actor): void
    {
        $this->repo->deleteForWorkspace();
    }
}
