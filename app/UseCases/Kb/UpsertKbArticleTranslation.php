<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbArticleTranslation;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Repositories\KbTranslationRepository;
use App\Services\KbLocales;
use Illuminate\Validation\ValidationException;

final class UpsertKbArticleTranslation
{
    public function __construct(
        private readonly KbAuthoringRepository $kb,
        private readonly KbTranslationRepository $translations,
    ) {}

    /** @param array{title: string, body: string} $data */
    public function handle(User $actor, string $articleId, string $locale, array $data): KbArticleTranslation
    {
        abort_unless($actor->is_agent, 403);
        $article = $this->kb->findArticle($articleId);
        abort_unless($article !== null, 404);
        self::assertTranslatable($locale);

        // Status is never set here — a new row defaults to draft, and an existing
        // one keeps whatever status it had. Publishing goes through
        // ChangeKbTranslationStatus, which owns the guards.
        return $this->translations->upsert($article->id, $locale, [
            'title' => $data['title'],
            'body' => $data['body'],
        ]);
    }

    /** The source language lives on the article itself and can never hold a translation row. */
    public static function assertTranslatable(string $locale): void
    {
        if (! in_array($locale, KbLocales::TRANSLATABLE, true)) {
            throw ValidationException::withMessages(['locale' => [
                $locale === KbLocales::SOURCE
                    ? 'English is the source language — edit it in the article editor.'
                    : 'Unsupported language.',
            ]]);
        }
    }
}
