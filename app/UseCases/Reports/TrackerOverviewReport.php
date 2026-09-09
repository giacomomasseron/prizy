<?php

declare(strict_types=1);

namespace App\UseCases\Reports;

use App\Models\User;
use App\Repositories\TrackerReportRepository;

final class TrackerOverviewReport
{
    public function __construct(private readonly TrackerReportRepository $reports) {}

    /** @return array<string, mixed> */
    public function handle(User $actor, string $range): array
    {
        abort_unless($actor->is_developer || $actor->admin_level === 'owner', 403);

        return $this->reports->overview($actor->workspace_id, $range);
    }
}
