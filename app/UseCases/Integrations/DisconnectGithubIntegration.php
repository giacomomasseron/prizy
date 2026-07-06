<?php

declare(strict_types=1);

namespace App\UseCases\Integrations;

use App\Models\User;
use App\Repositories\GithubIntegrationRepository;

final class DisconnectGithubIntegration
{
    public function __construct(private readonly GithubIntegrationRepository $repo) {}

    public function handle(User $actor): void
    {
        $this->repo->deleteForWorkspace();
    }
}
