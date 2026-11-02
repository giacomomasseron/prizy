<?php

declare(strict_types=1);

namespace App\UseCases\Labels;

use App\Models\Label;
use App\Models\User;
use App\Repositories\LabelRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method static Label run(User $actor, array $data)
 */
final class CreateLabel extends BaseUseCase implements UseCaseInterface
{
    private readonly LabelRepository $labels;

    public function handle(mixed ...$arguments): mixed
    {
        $this->labels = app(LabelRepository::class);

        return $this->execute(...$arguments);
    }

    /** @param array<string, mixed> $data */
    private function execute(User $actor, array $data): Label
    {
        $group = isset($data['group']) ? trim((string) $data['group']) : '';
        return $this->labels->create([
            'name'  => $data['name'],
            'color' => $data['color'] ?? '#94a3b8',
            'group' => $group === '' ? null : $group,
        ]);
    }
}
