<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\User;
use App\Repositories\KbAuthoringRepository;

final class DeleteKbSection
{
    public function __construct(private readonly KbAuthoringRepository $kb) {}

    public function handle(User $actor, string $id): void
    {
        abort_unless($actor->is_agent, 403);
        $section = $this->kb->findSection($id);
        abort_unless($section !== null, 404);
        $this->kb->deleteSection($section);
    }
}
