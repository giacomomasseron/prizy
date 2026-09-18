<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbArticle;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Repositories\KbVersionRepository;
use App\Services\HelpdeskAccess;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class UpdateKbArticle
{
    public function __construct(
        private readonly KbAuthoringRepository $kb,
        private readonly KbVersionRepository $versions,
    ) {}

    /** @param array<string,mixed> $data any of title, slug, body, section_id */
    public function handle(User $actor, string $id, array $data): KbArticle
    {
        HelpdeskAccess::gate($actor);
        $article = $this->kb->findArticle($id);
        abort_unless($article !== null, 404);

        $targetSectionId = $article->section_id;
        if (isset($data['section_id']) && $data['section_id'] !== $article->section_id) {
            $section = $this->kb->findSection($data['section_id']);
            if ($section === null) {
                throw ValidationException::withMessages(['section_id' => ['Unknown section.']]);
            }
            $targetSectionId = $section->id;
        }
        $slug = $data['slug'] ?? $article->slug;
        if ($this->kb->articleSlugTaken($targetSectionId, $slug, $article->id)) {
            throw ValidationException::withMessages(['slug' => ['Already used in this section.']]);
        }

        $body = $data['body'] ?? $article->body;
        if ($article->status === 'published' && trim($body) === '') {
            throw ValidationException::withMessages(['body' => ['A published article cannot be left empty.']]);
        }

        $before = ['title' => $article->title, 'body' => $article->body];

        return DB::transaction(function () use ($article, $data, $actor, $before): KbArticle {
            $updated = $this->kb->updateArticle($article, array_intersect_key($data, array_flip(['title', 'slug', 'body', 'section_id'])));

            // Only CONTENT changes earn a version: a slug edit or a section
            // move leaves the article's text untouched, and a no-op save
            // must not inflate history.
            if ($updated->title !== $before['title'] || $updated->body !== $before['body']) {
                $this->versions->recordVersion($updated, $actor);
            }

            return $updated;
        });
    }
}
