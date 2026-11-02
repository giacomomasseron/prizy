<?php

declare(strict_types=1);

namespace App\UseCases\Releases;

use App\Models\Release;
use App\Models\User;
use App\Repositories\ReleaseRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method static Release run(User $actor, array $data)
 */
final class CreateRelease extends BaseUseCase implements UseCaseInterface
{
    private readonly ReleaseRepository $releases;

    public function handle(mixed ...$arguments): mixed
    {
        $this->releases = app(ReleaseRepository::class);

        return $this->execute(...$arguments);
    }

    /** @param array<string, mixed> $data */
    private function execute(User $actor, array $data): Release
    {
        return $this->releases->create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'target_date' => $data['target_date'] ?? null,
        ]);
    }
}
