<?php

declare(strict_types=1);

namespace App\UseCases\HelpdeskSavedReports;

use App\Models\HelpdeskSavedReport;
use App\Models\User;
use App\Repositories\HelpdeskSavedReportRepository;
use App\Services\HelpdeskAccess;

final class CreateHelpdeskSavedReport
{
    public function __construct(private readonly HelpdeskSavedReportRepository $reports) {}

    /** @param array<string,mixed> $data */
    public function handle(User $actor, array $data): HelpdeskSavedReport
    {
        HelpdeskAccess::gate($actor);

        return $this->reports->create([
            'name' => $data['name'],
            'created_by' => $actor->id,
            'definition' => $data['definition'],
        ]);
    }
}
