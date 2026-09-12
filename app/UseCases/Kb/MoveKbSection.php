<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbSection;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;

final class MoveKbSection
{
    public function __construct(private readonly KbAuthoringRepository $kb) {}

    public function handle(User $actor, string $id, string $direction): KbSection
    {
        abort_unless($actor->is_agent, 403);
        $section = $this->kb->findSection($id);
        abort_unless($section !== null, 404);
        $this->kb->moveSection($section, $direction);

        return $section->refresh();
    }
}
