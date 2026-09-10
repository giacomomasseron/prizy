<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\UseCases\Portal\ListOwnTickets;
use App\UseCases\Portal\ReplyToOwnTicket;
use App\UseCases\Portal\ShowOwnTicket;
use App\UseCases\Portal\SolveOwnTicket;
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
    ) {}

    public function requests(Request $request): View
    {
        $filter = (string) $request->query('f', 'all');
        if (! in_array($filter, self::FILTERS, true)) {
            $filter = 'all';
        }
        $q = (string) $request->query('q', '');

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
        $this->replyToOwnTicket->handle(Auth::guard('contact')->user(), $ticket, (string) $request->input('body'));

        return redirect()->route('help.request', $ticket);
    }

    public function solve(string $ticket): RedirectResponse
    {
        $this->solveOwnTicket->handle(Auth::guard('contact')->user(), $ticket);

        return redirect()->route('help.request', $ticket);
    }
}
