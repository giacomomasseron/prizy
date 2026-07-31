<?php

declare(strict_types=1);

namespace App\UseCases\HelpdeskSavedReports;

use App\Models\HelpdeskSavedReport;
use App\Models\User;
use App\Repositories\HelpdeskSavedReportRepository;

final class CreateHelpdeskSavedReport
{
    public function __construct(private readonly HelpdeskSavedReportRepository $reports) {}

    /** @param array<string,mixed> $data */
    public function handle(User $actor, array $data): HelpdeskSavedReport
    {
        abort_unless($actor->is_agent, 403);

        return $this->reports->create([
            'name' => $data['name'],
            'created_by' => $actor->id,
            'definition' => $data['definition'],
        ]);
    }
}
