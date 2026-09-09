<?php

declare(strict_types=1);

namespace App\UseCases\Releases;

use App\Models\Release;
use App\Repositories\ReleaseRepository;
use Illuminate\Validation\ValidationException;

final class ShipRelease
{
    public function __construct(private readonly ReleaseRepository $releases) {}

    public function handle(Release $release, bool $ship): Release
    {
        if ($ship && $release->shipped_at !== null) {
            throw ValidationException::withMessages(['shipped_at' => ['The release is already shipped.']]);
        }
        if (! $ship && $release->shipped_at === null) {
            throw ValidationException::withMessages(['shipped_at' => ['The release is not shipped.']]);
        }

        return $this->releases->update($release, ['shipped_at' => $ship ? now() : null]);
    }
}
