<?php

declare(strict_types=1);

namespace App\UseCases\Releases;

use App\Models\Release;
use App\Repositories\ReleaseRepository;

final class UpdateRelease
{
    public function __construct(private readonly ReleaseRepository $releases) {}

    /** @param array<string, mixed> $data */
    public function handle(Release $release, array $data): Release
    {
        return $this->releases->update($release, array_intersect_key($data, array_flip(['name', 'description', 'target_date'])));
    }
}
