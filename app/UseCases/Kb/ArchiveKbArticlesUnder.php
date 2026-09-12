<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\User;
use App\Repositories\KbAuthoringRepository;

final class ArchiveKbArticlesUnder
{
    public function __construct(private readonly KbAuthoringRepository $kb) {}

    /** @param 'category'|'section' $kind */
    public function handle(User $actor, string $kind, string $id): int
    {
        abort_unless($actor->is_agent, 403);
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
