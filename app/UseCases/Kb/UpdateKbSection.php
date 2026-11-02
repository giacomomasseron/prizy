<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbSection;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Validation\ValidationException;

/**
 * @method static KbSection run(User $actor, string $id, array $data)
 */
final class UpdateKbSection extends BaseUseCase implements UseCaseInterface
{
    private readonly KbAuthoringRepository $kb;

    public function handle(mixed ...$arguments): mixed
    {
        $this->kb = app(KbAuthoringRepository::class);

        return $this->execute(...$arguments);
    }

    /** @param array<string,mixed> $data */
    private function execute(User $actor, string $id, array $data): KbSection
    {
        HelpdeskAccess::gateWrite($actor);
        $section = $this->kb->findSection($id);
        abort_unless($section !== null, 404);
        if ($this->kb->sectionSlugTaken($section->category_id, $data['slug'], $section->id)) {
            throw ValidationException::withMessages(['slug' => ['Already used by another section.']]);
        }

        return $this->kb->updateSection($section, $data);
    }
}
