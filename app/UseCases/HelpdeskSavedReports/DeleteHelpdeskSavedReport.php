<?php

declare(strict_types=1);

namespace App\UseCases\HelpdeskSavedReports;

use App\Models\User;
use App\Repositories\HelpdeskSavedReportRepository;
use App\Services\HelpdeskAccess;

final class DeleteHelpdeskSavedReport
{
    public function __construct(private readonly HelpdeskSavedReportRepository $reports) {}

    public function handle(User $actor, string $id): void
    {
        HelpdeskAccess::gate($actor);
        $report = $this->reports->findInWorkspace($id);
        abort_unless($report !== null, 404);

        $this->reports->delete($report);
    }
}
