<?php

declare(strict_types=1);

namespace App\UseCases\Labels;

use App\Models\Label;
use App\Models\User;
use App\Repositories\LabelRepository;

final class CreateLabel
{
    public function __construct(private readonly LabelRepository $labels) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): Label
    {
        return $this->labels->create(['name' => $data['name'], 'color' => $data['color'] ?? '#94a3b8']);
    }
}
