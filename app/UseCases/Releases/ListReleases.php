<?php

declare(strict_types=1);

namespace App\UseCases\Releases;

use App\Models\Release;
use App\Repositories\ReleaseRepository;
use Illuminate\Database\Eloquent\Collection;

final class ListReleases
{
    public function __construct(private readonly ReleaseRepository $releases) {}

    /** @return Collection<int, Release> */
    public function handle(string $workspaceId): Collection
    {
        return $this->releases->forWorkspace($workspaceId);
    }
}
