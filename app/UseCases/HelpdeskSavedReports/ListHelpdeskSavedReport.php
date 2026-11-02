<?php

declare(strict_types=1);

namespace App\UseCases\HelpdeskSavedReports;

use App\Models\HelpdeskSavedReport;
use App\Models\User;
use App\Repositories\HelpdeskSavedReportRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * @method static Collection run(User $actor)
 */
final class ListHelpdeskSavedReport extends BaseUseCase implements UseCaseInterface
{
    private readonly HelpdeskSavedReportRepository $reports;

    public function handle(mixed ...$arguments): mixed
    {
        $this->reports = app(HelpdeskSavedReportRepository::class);

        return $this->execute(...$arguments);
    }

    /** @return Collection<int, HelpdeskSavedReport> */
    private function execute(User $actor): Collection
    {
        HelpdeskAccess::gate($actor);

        return $this->reports->forWorkspace();
    }
}
