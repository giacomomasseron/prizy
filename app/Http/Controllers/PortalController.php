<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\View\View;

/**
 * Contact-portal pages behind the `contact` guard (HC-2).
 *
 * Minimal stub for Task 1 — establishes the auth:contact-gated route so the
 * login-consume redirect and guest-redirect tests are green independently.
 * Task 2 replaces requests() with the real ticket list.
 */
final class PortalController extends Controller
{
    public function requests(): View
    {
        return view('help.requests');
    }
}
