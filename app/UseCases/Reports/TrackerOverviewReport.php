<?php

declare(strict_types=1);

namespace App\UseCases\Reports;

use App\Models\User;
use App\Repositories\TrackerReportRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method static array run(User $actor, string $range)
 */
final class TrackerOverviewReport extends BaseUseCase implements UseCaseInterface
{
    private readonly TrackerReportRepository $reports;

    public function handle(mixed ...$arguments): mixed
    {
        $this->reports = app(TrackerReportRepository::class);

        return $this->execute(...$arguments);
    }

    /** @return array<string, mixed> */
    private function execute(User $actor, string $range): array
    {
        abort_unless($actor->is_developer || $actor->admin_level === 'owner', 403);

        return $this->reports->overview($actor->workspace_id, $range);
    }
}
