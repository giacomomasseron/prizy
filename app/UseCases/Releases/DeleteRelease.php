<?php

declare(strict_types=1);

namespace App\UseCases\Releases;

use App\Models\Release;
use App\Repositories\ReleaseRepository;

final class DeleteRelease
{
    public function __construct(private readonly ReleaseRepository $releases) {}

    public function handle(Release $release): void
    {
        $this->releases->delete($release);
    }
}
