<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbSection;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Services\HelpdeskAccess;
use Illuminate\Validation\ValidationException;

final class UpdateKbSection
{
    public function __construct(private readonly KbAuthoringRepository $kb) {}

    /** @param array<string,mixed> $data */
    public function handle(User $actor, string $id, array $data): KbSection
    {
        HelpdeskAccess::gate($actor);
        $section = $this->kb->findSection($id);
        abort_unless($section !== null, 404);
        if ($this->kb->sectionSlugTaken($section->category_id, $data['slug'], $section->id)) {
            throw ValidationException::withMessages(['slug' => ['Already used by another section.']]);
        }

        return $this->kb->updateSection($section, $data);
    }
}
