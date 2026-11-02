<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbCategory;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method KbCategory run(User $actor, string $id, string $direction)
 */
final class MoveKbCategory extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly KbAuthoringRepository $kb) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    private function execute(User $actor, string $id, string $direction): KbCategory
    {
        HelpdeskAccess::gateWrite($actor);
        $category = $this->kb->findCategory($id);
        abort_unless($category !== null, 404);
        $this->kb->moveCategory($category, $direction);

        return $category->refresh();
    }
}
