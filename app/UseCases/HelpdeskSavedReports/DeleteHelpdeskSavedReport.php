<?php

declare(strict_types=1);

namespace App\UseCases\HelpdeskSavedReports;

use App\Models\User;
use App\Repositories\HelpdeskSavedReportRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method void run(User $actor, string $id)
 */
final class DeleteHelpdeskSavedReport extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly HelpdeskSavedReportRepository $reports) {}

    public function handle(mixed ...$arguments): mixed
    {
        $this->execute(...$arguments);

        return null;
    }

    private function execute(User $actor, string $id): void
    {
        HelpdeskAccess::gateWrite($actor);
        $report = $this->reports->findInWorkspace($id);
        abort_unless($report !== null, 404);

        $this->reports->delete($report);
    }
}
