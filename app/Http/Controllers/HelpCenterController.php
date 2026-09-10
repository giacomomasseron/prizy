<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\UseCases\HelpCenter\RecordArticleFeedback;
use App\UseCases\HelpCenter\SearchHelpArticles;
use App\UseCases\HelpCenter\ShowHelpArticle;
use App\UseCases\HelpCenter\ShowHelpHome;
use App\UseCases\HelpCenter\ShowHelpTopic;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

final class HelpCenterController extends Controller
{
    public function __construct(
        private readonly ShowHelpHome $showHelpHome,
        private readonly ShowHelpTopic $showHelpTopic,
        private readonly ShowHelpArticle $showHelpArticle,
        private readonly SearchHelpArticles $searchHelpArticles,
        private readonly RecordArticleFeedback $recordArticleFeedback,
    ) {}

    public function home(): View
    {
        return view('help.home', $this->showHelpHome->handle());
    }

    public function topic(string $category): View
    {
        return view('help.topic', $this->showHelpTopic->handle($category));
    }

    public function article(string $category, string $section, string $article): View
    {
        return view('help.article', $this->showHelpArticle->handle($category, $section, $article));
    }

    public function search(Request $request): View|RedirectResponse
    {
        $q = trim((string) $request->query('q'));
        if ($q === '') {
            return redirect('/help');
        }

        return view('help.search', ['q' => $q, 'results' => $this->searchHelpArticles->handle($q)]);
    }

    public function feedback(Request $request, string $article): RedirectResponse
    {
        $this->recordArticleFeedback->handle($article, (string) $request->input('vote'));

        // Referer, not back(): back() re-derives from the session's "previous URL"
        // which these public/unauthenticated requests don't reliably carry.
        return redirect(($request->headers->get('referer') ?: '/help').'?voted=1');
    }
}
