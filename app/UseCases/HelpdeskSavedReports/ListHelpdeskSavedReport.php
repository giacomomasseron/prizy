<?php

declare(strict_types=1);

namespace App\UseCases\HelpdeskSavedReports;

use App\Models\HelpdeskSavedReport;
use App\Models\User;
use App\Repositories\HelpdeskSavedReportRepository;
use Illuminate\Database\Eloquent\Collection;

final class ListHelpdeskSavedReport
{
    public function __construct(private readonly HelpdeskSavedReportRepository $reports) {}

    /** @return Collection<int, HelpdeskSavedReport> */
    public function handle(User $actor): Collection
    {
        abort_unless($actor->is_agent, 403);

        return $this->reports->forWorkspace();
    }
}
