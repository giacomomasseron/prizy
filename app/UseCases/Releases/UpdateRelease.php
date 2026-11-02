<?php

declare(strict_types=1);

namespace App\UseCases\Releases;

use App\Models\Release;
use App\Repositories\ReleaseRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method Release run(Release $release, array $data)
 */
final class UpdateRelease extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly ReleaseRepository $releases) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @param array<string, mixed> $data */
    private function execute(Release $release, array $data): Release
    {
        return $this->releases->update($release, array_intersect_key($data, array_flip(['name', 'description', 'target_date'])));
    }
}
