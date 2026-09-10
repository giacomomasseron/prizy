<?php

declare(strict_types=1);

namespace App\UseCases\HelpCenter;

use App\Repositories\KbRepository;
use Illuminate\Support\Collection as BaseCollection;

/**
 * Public help-center read — no actor: the pages are unauthenticated (CSAT precedent).
 */
final class SearchHelpArticles
{
    public function __construct(private readonly KbRepository $kb) {}

    /**
     * @return BaseCollection<int, object{id:string,title:string,slug:string,section_slug:string,category_slug:string,category_name:string,snippet:string,snippet_html:string}>
     */
    public function handle(string $q): BaseCollection
    {
        return $this->kb->search($q)->map(function (object $r): object {
            // The repo asked ts_headline for plain-text [[[ / ]]] markers (not raw
            // <b> tags) precisely so the snippet — sourced from untrusted article
            // BODY text — can be escaped whole before those markers are turned
            // into real markup. Blade then prints this one pre-escaped string
            // with `{!! !!}`.
            $r->snippet_html = str_replace(['[[[', ']]]'], ['<b>', '</b>'], e($r->snippet));

            return $r;
        });
    }
}
