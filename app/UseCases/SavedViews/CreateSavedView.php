<?php

declare(strict_types=1);

namespace App\UseCases\SavedViews;

use App\Models\SavedView;
use App\Models\User;
use App\Repositories\SavedViewRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method SavedView run(User $actor, array $data)
 */
final class CreateSavedView extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly SavedViewRepository $views) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @param array<string, mixed> $data */
    private function execute(User $actor, array $data): SavedView
    {
        return $this->views->create([
            'name'       => $data['name'],
            'definition' => $data['definition'],
            'created_by' => $actor->id,
        ]);
    }
}
