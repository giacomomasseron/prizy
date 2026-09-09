<?php

declare(strict_types=1);

namespace App\UseCases\Releases;

use App\Models\Release;
use App\Models\User;
use App\Repositories\ReleaseRepository;

final class CreateRelease
{
    public function __construct(private readonly ReleaseRepository $releases) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): Release
    {
        return $this->releases->create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'target_date' => $data['target_date'] ?? null,
        ]);
    }
}
