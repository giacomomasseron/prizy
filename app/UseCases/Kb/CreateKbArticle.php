<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbArticle;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Repositories\KbVersionRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * @method KbArticle run(User $actor, array $data)
 */
final class CreateKbArticle extends BaseUseCase implements UseCaseInterface
{
    public function __construct(
        private readonly KbAuthoringRepository $kb,
        private readonly KbVersionRepository $versions,
    ) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @param array{section_id:string,title:string,slug:string,body:string} $data */
    private function execute(User $actor, array $data): KbArticle
    {
        HelpdeskAccess::gateWrite($actor);
        $section = $this->kb->findSection($data['section_id']);
        if ($section === null) {
            throw ValidationException::withMessages(['section_id' => ['Unknown section.']]);
        }
        if ($this->kb->articleSlugTaken($section->id, $data['slug'])) {
            throw ValidationException::withMessages(['slug' => ['Already used in this section.']]);
        }

        return DB::transaction(function () use ($section, $actor, $data): KbArticle {
            $article = $this->kb->createArticle($section, $actor, ['title' => $data['title'], 'slug' => $data['slug'], 'body' => $data['body']]);
            $this->versions->recordVersion($article, $actor);

            return $article;
        });
    }
}
