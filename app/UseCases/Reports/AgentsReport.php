<?php

declare(strict_types=1);

namespace App\UseCases\Reports;

use App\Models\User;
use App\Repositories\ReportRepository;
use App\Services\HelpdeskAccess;

final class AgentsReport
{
    public function __construct(private readonly ReportRepository $reports) {}

    /** @return array<string, mixed> */
    public function handle(User $actor, string $range): array
    {
        HelpdeskAccess::gate($actor);

        return $this->reports->agents($actor->workspace_id, $range);
    }
}
