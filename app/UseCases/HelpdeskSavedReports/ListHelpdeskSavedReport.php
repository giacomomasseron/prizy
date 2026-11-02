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
 * @method Collection run(User $actor)
 */
final class ListHelpdeskSavedReport extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly HelpdeskSavedReportRepository $reports) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @return Collection<int, HelpdeskSavedReport> */
    private function execute(User $actor): Collection
    {
        HelpdeskAccess::gate($actor);

        return $this->reports->forWorkspace();
    }
}
