<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method void run(User $actor, string $id)
 */
final class DeleteKbCategory extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly KbAuthoringRepository $kb) {}

    public function handle(mixed ...$arguments): mixed
    {
        $this->execute(...$arguments);

        return null;
    }

    private function execute(User $actor, string $id): void
    {
        HelpdeskAccess::gateWrite($actor);
        $category = $this->kb->findCategory($id);
        abort_unless($category !== null, 404);
        $this->kb->deleteCategory($category);
    }
}
