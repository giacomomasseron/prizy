<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method static int run(User $actor, string $kind, string $id)
 */
final class ArchiveKbArticlesUnder extends BaseUseCase implements UseCaseInterface
{
    private readonly KbAuthoringRepository $kb;

    public function handle(mixed ...$arguments): mixed
    {
        $this->kb = app(KbAuthoringRepository::class);

        return $this->execute(...$arguments);
    }

    /** @param 'category'|'section' $kind */
    private function execute(User $actor, string $kind, string $id): int
    {
        HelpdeskAccess::gateWrite($actor);
        if ($kind === 'category') {
            $category = $this->kb->findCategory($id);
            abort_unless($category !== null, 404);

            return $this->kb->archiveArticlesUnderCategory($category);
        }
        $section = $this->kb->findSection($id);
        abort_unless($section !== null, 404);

        return $this->kb->archiveArticlesUnderSection($section);
    }
}
