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
        $email = (string) $request->string('email');
        if ($email !== '') {
            $this->requestLink->handle($email);
        }

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
