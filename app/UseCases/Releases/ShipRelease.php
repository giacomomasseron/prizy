<?php

declare(strict_types=1);

namespace App\UseCases\Releases;

use App\Models\Release;
use App\Repositories\ReleaseRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Validation\ValidationException;

/**
 * @method static Release run(Release $release, bool $ship)
 */
final class ShipRelease extends BaseUseCase implements UseCaseInterface
{
    private readonly ReleaseRepository $releases;

    public function handle(mixed ...$arguments): mixed
    {
        $this->releases = app(ReleaseRepository::class);

        return $this->execute(...$arguments);
    }

    private function execute(Release $release, bool $ship): Release
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
