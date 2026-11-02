<?php

declare(strict_types=1);

namespace App\UseCases\HelpCenter;

use App\Repositories\KbRepository;
use App\Repositories\KbTranslationRepository;
use App\Services\KbLocales;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Support\Collection as BaseCollection;

/**
 * Public help-center read — no actor: the pages are unauthenticated (CSAT precedent).
 *
 * @method static BaseCollection run(string $q, string $lang = KbLocales::SOURCE)
 */
final class SearchHelpArticles extends BaseUseCase implements UseCaseInterface
{
    private readonly KbRepository $kb;

    private readonly KbTranslationRepository $translations;

    public function handle(mixed ...$arguments): mixed
    {
        $this->kb = app(KbRepository::class);
        $this->translations = app(KbTranslationRepository::class);

        return $this->execute(...$arguments);
    }

    /**
     * @return BaseCollection<int, object{id:string,title:string,slug:string,section_slug:string,category_slug:string,category_name:string,snippet:string,snippet_html:string}>
     */
    private function execute(string $q, string $lang = KbLocales::SOURCE): BaseCollection
    {
        $rows = $lang === KbLocales::SOURCE ? $this->kb->search($q) : $this->merged($q, $lang);

        return $rows->map(function (object $r): object {
            // The repo asked ts_headline for plain-text [[[ / ]]] markers (not raw
            // <b> tags) precisely so the snippet — sourced from untrusted article
            // BODY text — can be escaped whole before those markers are turned
            // into real markup. Blade then prints this one pre-escaped string
            // with `{!! !!}`.
            $r->snippet_html = str_replace(['[[[', ']]]'], ['<b>', '</b>'], e($r->snippet));

            return $r;
        });
    }

    /**
     * The locale's own hits first, then English articles with no published
     * translation in that locale — a reader searching in French should find
     * French content first and English content rather than nothing.
     *
     * Dropping covered rows after the English query's own limit can return fewer
     * than $limit results. Accepted: it matches the spec's "capped at the
     * existing limit" and avoids a second round trip.
     *
     * @return BaseCollection<int, object>
     */
    private function merged(string $q, string $lang, int $limit = 20): BaseCollection
    {
        $translated = $this->translations->searchPublished($q, $lang, $limit);
        $english = $this->kb->search($q, $limit);

        // The spec's fallback group is English articles with NO published
        // translation in this locale — a statement about EXISTENCE, not about
        // whether that translation matched this query. Excluding only the ids
        // that matched would surface an English row for an article we have
        // already translated, misrepresenting what exists in the reader's
        // language.
        $alreadyTranslated = $this->translations
            ->publishedForArticles($english->pluck('id')->all(), $lang)
            ->keys()
            ->all();

        $fallback = $english
            ->reject(fn (object $r): bool => in_array($r->id, $alreadyTranslated, true))
            ->values();

        return $translated->concat($fallback)->take($limit)->values();
    }
}
