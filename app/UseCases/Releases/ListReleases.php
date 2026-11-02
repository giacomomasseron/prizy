<?php

declare(strict_types=1);

namespace App\UseCases\Releases;

use App\Models\Release;
use App\Repositories\ReleaseRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * @method static Collection run(string $workspaceId)
 */
final class ListReleases extends BaseUseCase implements UseCaseInterface
{
    private readonly ReleaseRepository $releases;

    public function handle(mixed ...$arguments): mixed
    {
        $this->releases = app(ReleaseRepository::class);

        return $this->execute(...$arguments);
    }

    /** @return Collection<int, Release> */
    private function execute(string $workspaceId): Collection
    {
        return $this->releases->forWorkspace($workspaceId);
    }
}
