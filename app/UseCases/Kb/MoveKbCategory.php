<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbCategory;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;

final class MoveKbCategory
{
    public function __construct(private readonly KbAuthoringRepository $kb) {}

    public function handle(User $actor, string $id, string $direction): KbCategory
    {
        abort_unless($actor->is_agent, 403);
        $category = $this->kb->findCategory($id);
        abort_unless($category !== null, 404);
        $this->kb->moveCategory($category, $direction);

        return $category->refresh();
    }
}
