<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbArticle;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Repositories\KbVersionRepository;
use Illuminate\Validation\ValidationException;

final class CreateKbArticle
{
    public function __construct(
        private readonly KbAuthoringRepository $kb,
        private readonly KbVersionRepository $versions,
    ) {}

    /** @param array{section_id:string,title:string,slug:string,body:string} $data */
    public function handle(User $actor, array $data): KbArticle
    {
        abort_unless($actor->is_agent, 403);
        $section = $this->kb->findSection($data['section_id']);
        if ($section === null) {
            throw ValidationException::withMessages(['section_id' => ['Unknown section.']]);
        }
        if ($this->kb->articleSlugTaken($section->id, $data['slug'])) {
            throw ValidationException::withMessages(['slug' => ['Already used in this section.']]);
        }

        $article = $this->kb->createArticle($section, $actor, ['title' => $data['title'], 'slug' => $data['slug'], 'body' => $data['body']]);
        $this->versions->recordVersion($article, $actor);

        return $article;
    }
}
