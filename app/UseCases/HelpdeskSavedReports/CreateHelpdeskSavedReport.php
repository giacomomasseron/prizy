<?php

declare(strict_types=1);

namespace App\UseCases\HelpdeskSavedReports;

use App\Models\HelpdeskSavedReport;
use App\Models\User;
use App\Repositories\HelpdeskSavedReportRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method static HelpdeskSavedReport run(User $actor, array $data)
 */
final class CreateHelpdeskSavedReport extends BaseUseCase implements UseCaseInterface
{
    private readonly HelpdeskSavedReportRepository $reports;

    public function handle(mixed ...$arguments): mixed
    {
        $this->reports = app(HelpdeskSavedReportRepository::class);

        return $this->execute(...$arguments);
    }

    /** @param array<string,mixed> $data */
    private function execute(User $actor, array $data): HelpdeskSavedReport
    {
        HelpdeskAccess::gateWrite($actor);

        return $this->reports->create([
            'name' => $data['name'],
            'created_by' => $actor->id,
            'definition' => $data['definition'],
        ]);
    }
}
