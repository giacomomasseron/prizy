<?php

declare(strict_types=1);

namespace App\UseCases\HelpdeskSavedViews;

use App\Models\User;
use App\Repositories\HelpdeskSavedViewRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method static void run(User $actor, string $id)
 */
final class DeleteHelpdeskSavedView extends BaseUseCase implements UseCaseInterface
{
    private readonly HelpdeskSavedViewRepository $views;

    public function handle(mixed ...$arguments): mixed
    {
        $this->views = app(HelpdeskSavedViewRepository::class);

        $this->execute(...$arguments);

        return null;
    }

    private function execute(User $actor, string $id): void
    {
        HelpdeskAccess::gateWrite($actor);
        $view = $this->views->findInWorkspace($id);
        abort_unless($view !== null, 404);

        $this->views->delete($view);
    }
}
