<?php

declare(strict_types=1);

namespace App\UseCases\Reports;

use App\Models\User;
use App\Repositories\ReportRepository;

final class OverviewReport
{
    public function __construct(private readonly ReportRepository $reports) {}

    /** @return array<string, mixed> */
    public function handle(User $actor, string $range): array
    {
        abort_unless($actor->is_agent, 403);

        return $this->reports->overview($actor->workspace_id, $range);
    }
}
