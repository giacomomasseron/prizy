<?php

declare(strict_types=1);

namespace App\UseCases\Releases;

use App\Models\Release;
use App\Repositories\ReleaseRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method void run(Release $release)
 */
final class DeleteRelease extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly ReleaseRepository $releases) {}

    public function handle(mixed ...$arguments): mixed
    {
        $this->execute(...$arguments);

        return null;
    }

    private function execute(Release $release): void
    {
        $this->releases->delete($release);
    }
}
