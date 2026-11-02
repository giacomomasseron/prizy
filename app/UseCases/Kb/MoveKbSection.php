<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbSection;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method static KbSection run(User $actor, string $id, string $direction)
 */
final class MoveKbSection extends BaseUseCase implements UseCaseInterface
{
    private readonly KbAuthoringRepository $kb;

    public function handle(mixed ...$arguments): mixed
    {
        $this->kb = app(KbAuthoringRepository::class);

        return $this->execute(...$arguments);
    }

    private function execute(User $actor, string $id, string $direction): KbSection
    {
        HelpdeskAccess::gateWrite($actor);
        $section = $this->kb->findSection($id);
        abort_unless($section !== null, 404);
        $this->kb->moveSection($section, $direction);

        return $section->refresh();
    }
}
