<?php

declare(strict_types=1);

namespace App\UseCases\HelpdeskSavedViews;

use App\Models\HelpdeskSavedView;
use App\Models\User;
use App\Repositories\HelpdeskSavedViewRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method HelpdeskSavedView run(User $actor, array $data)
 */
final class CreateHelpdeskSavedView extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly HelpdeskSavedViewRepository $views) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @param array<string,mixed> $data */
    private function execute(User $actor, array $data): HelpdeskSavedView
    {
        HelpdeskAccess::gateWrite($actor);

        return $this->views->create([
            'name' => $data['name'],
            'created_by' => $actor->id,
            'definition' => $data['definition'],
        ]);
    }
}
