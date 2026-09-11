<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Portal\SubmitPortalRequestRequest;
use App\UseCases\HelpCenter\ListTopArticles;
use App\UseCases\Portal\ListOwnTickets;
use App\UseCases\Portal\ReplyToOwnTicket;
use App\UseCases\Portal\ShowOwnTicket;
use App\UseCases\Portal\SolveOwnTicket;
use App\UseCases\Portal\SubmitPortalRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

/**
 * Contact-portal pages behind the `contact` guard (HC-2): "My requests" list,
 * detail with the derived conversation, reply, and self-solve. The actor is
 * passed straight from the guard into each use case (deptrac: a Controller
 * may not depend on the Contact Entity directly — the use case's own
 * `Contact $actor` parameter is where that type-check belongs).
 */
final class PortalController extends Controller
{
    /** @var list<string> */
    private const FILTERS = ['all', 'open', 'solved'];

    public function __construct(
        private readonly ListOwnTickets $listOwnTickets,
        private readonly ShowOwnTicket $showOwnTicket,
        private readonly ReplyToOwnTicket $replyToOwnTicket,
        private readonly SolveOwnTicket $solveOwnTicket,
        private readonly SubmitPortalRequest $submitPortalRequest,
        private readonly ListTopArticles $topArticles,
    ) {}

    public function requests(Request $request): View
    {
        // Guard against array input (e.g. `f[]=x`) reaching a string
        // context: a bare (string) cast on an array warns/500s instead of
        // just falling back to the default.
        $f = $request->query('f');
        $filter = is_string($f) ? $f : 'all';
        if (! in_array($filter, self::FILTERS, true)) {
            $filter = 'all';
        }
        $q = $request->query('q');
        $q = is_string($q) ? $q : '';

        return view('help.requests', $this->listOwnTickets->handle(Auth::guard('contact')->user(), $filter, $q) + [
            'filter' => $filter,
            'q' => $q,
        ]);
    }

    public function show(string $ticket): View
    {
        return view('help.request', $this->showOwnTicket->handle(Auth::guard('contact')->user(), $ticket));
    }

    public function reply(Request $request, string $ticket): RedirectResponse
    {
        // Same array-input guard as requests(): a non-string body (e.g.
        // `body[]=x`) falls back to '', which trips the use case's existing
        // "empty reply" ValidationException path instead of 500ing.
        $body = $request->input('body');
        $body = is_string($body) ? $body : '';

        $this->replyToOwnTicket->handle(Auth::guard('contact')->user(), $ticket, $body);

        return redirect()->route('help.request', $ticket);
    }

    public function solve(string $ticket): RedirectResponse
    {
        $this->solveOwnTicket->handle(Auth::guard('contact')->user(), $ticket);

        return redirect()->route('help.request', $ticket);
    }

    public function new(): View
    {
        return view('help.new', ['selfHelp' => $this->topArticles->handle()]);
    }

    public function store(SubmitPortalRequestRequest $request): RedirectResponse
    {
        $ticket = $this->submitPortalRequest->handle(
            Auth::guard('contact')->user(),
            $request->validated(),
        );

        return redirect()->route('help.request', $ticket);
    }
}
