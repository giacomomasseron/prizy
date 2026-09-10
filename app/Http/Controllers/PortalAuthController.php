<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\UseCases\Portal\ConsumePortalLoginLink;
use App\UseCases\Portal\RequestPortalLoginLink;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\Response;

final class PortalAuthController extends Controller
{
    public function __construct(
        private readonly RequestPortalLoginLink $requestLink,
        private readonly ConsumePortalLoginLink $consumeLink,
    ) {}

    public function showLogin(): View|RedirectResponse
    {
        if (Auth::guard('contact')->check()) {
            return redirect()->route('help.requests');
        }

        return view('help.login', ['sent' => false]);
    }

    public function sendLink(Request $request): View
    {
        // Array input (e.g. `email[]=a`) must fail validation (→ redirect
        // back) rather than reach the (string) cast, which would 500 and
        // puncture the anti-enumeration guarantee below.
        $data = $request->validate(['email' => ['required', 'string', 'email']]);
        $this->requestLink->handle($data['email']);

        // Identical response whether or not the contact exists (anti-enumeration).
        return view('help.login', ['sent' => true]);
    }

    public function consume(Request $request, string $nonce, string $contact): Response
    {
        if (! $request->hasValidSignature()) {
            return response()->view('help.link-expired', [], 403);
        }
        $model = $this->consumeLink->handle($nonce, $contact);
        if ($model === null) {
            return response()->view('help.link-expired', [], 403);
        }

        Auth::guard('contact')->login($model);
        $request->session()->regenerate();

        return redirect()->route('help.requests');
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::guard('contact')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/help');
    }
}
