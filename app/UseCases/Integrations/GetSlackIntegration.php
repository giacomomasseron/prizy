<?php

declare(strict_types=1);

namespace App\UseCases\Integrations;

use App\Models\SlackIntegration;
use App\Models\User;
use App\Repositories\SlackIntegrationRepository;

final class GetSlackIntegration
{
    public function __construct(private readonly SlackIntegrationRepository $repo) {}

    public function handle(User $actor): ?SlackIntegration
    {
        return $this->repo->forWorkspace();
    }
}
