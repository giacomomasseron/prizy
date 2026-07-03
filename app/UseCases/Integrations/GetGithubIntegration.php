<?php

declare(strict_types=1);

namespace App\UseCases\Integrations;

use App\Models\GithubIntegration;
use App\Models\User;
use App\Repositories\GithubIntegrationRepository;

final class GetGithubIntegration
{
    public function __construct(private readonly GithubIntegrationRepository $repo) {}

    public function handle(User $actor): ?GithubIntegration
    {
        return $this->repo->forWorkspace();
    }
}
