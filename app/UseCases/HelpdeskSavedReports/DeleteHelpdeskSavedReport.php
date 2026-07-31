<?php

declare(strict_types=1);

namespace App\UseCases\HelpdeskSavedReports;

use App\Models\User;
use App\Repositories\HelpdeskSavedReportRepository;

final class DeleteHelpdeskSavedReport
{
    public function __construct(private readonly HelpdeskSavedReportRepository $reports) {}

    public function handle(User $actor, string $id): void
    {
        abort_unless($actor->is_agent, 403);
        $report = $this->reports->findInWorkspace($id);
        abort_unless($report !== null, 404);

        $this->reports->delete($report);
    }
}
