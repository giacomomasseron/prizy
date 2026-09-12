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
use Illuminate\Support\Facades\Auth;
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
        // deptrac: Controller must not depend on the Contact Entity directly —
        // the guard's result is handed straight to the use case, whose own
        // `?Contact $contact` parameter is where that type belongs.
        return view('help.home', $this->showHelpHome->handle(Auth::guard('contact')->user()));
    }

    public function topic(string $category): View
    {
        return view('help.topic', $this->showHelpTopic->handle($category));
    }

    public function article(string $category, string $section, string $article): View|RedirectResponse
    {
        $data = $this->showHelpArticle->handle($category, $section, $article);
        if (isset($data['redirect'])) {
            return redirect($data['redirect']);
        }

        return view('help.article', $data);
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
        $recorded = $this->recordArticleFeedback->handle($article, $request->input('vote'));

        // Referer, not back(): back() re-derives from the session's "previous URL"
        // which these public/unauthenticated requests don't reliably carry.
        // Only ever honor a referer on the SAME host as this request — echoing
        // an attacker-supplied Referer straight into Location is a reflected
        // open-redirect (e.g. Referer: https://evil.example/phish?voted=1).
        // Any cross-host or missing referer falls back to the help home route.
        $referer = $request->headers->get('referer');
        $ref = ($referer !== null && parse_url($referer, PHP_URL_HOST) === $request->getHost())
            ? $referer
            : route('help.home');

        if (! $recorded) {
            return redirect($ref);
        }

        $sep = str_contains($ref, '?') ? '&' : '?';

        return redirect($ref.$sep.'voted=1');
    }
}
