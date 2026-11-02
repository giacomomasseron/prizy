<?php

declare(strict_types=1);

namespace App\UseCases\Reports;

use App\Models\User;
use App\Repositories\ReportRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method array run(User $actor, string $range)
 */
final class SlaReport extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly ReportRepository $reports) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @return array<string, mixed> */
    private function execute(User $actor, string $range): array
    {
        HelpdeskAccess::gate($actor);

        return $this->reports->sla($actor->workspace_id, $range);
    }
}
