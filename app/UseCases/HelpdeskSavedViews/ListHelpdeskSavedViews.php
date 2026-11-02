<?php

declare(strict_types=1);

namespace App\UseCases\HelpdeskSavedViews;

use App\Models\HelpdeskSavedView;
use App\Models\User;
use App\Repositories\HelpdeskSavedViewRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * @method Collection run(User $actor)
 */
final class ListHelpdeskSavedViews extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly HelpdeskSavedViewRepository $views) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @return Collection<int, HelpdeskSavedView> */
    private function execute(User $actor): Collection
    {
        HelpdeskAccess::gate($actor);

        return $this->views->forWorkspace();
    }
}
