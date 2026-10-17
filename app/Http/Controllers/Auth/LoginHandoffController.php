<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\UseCases\Auth\ConsumeMagicLink;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * Opens a LoginHandoff link on the workspace's own host: logs the user in and
 * lands them on /setup, the rest of setting up the workspace (a handoff is
 * only ever made for its new owner, at sign-up or activation). Anything wrong
 * with the link — tampered, expired, already used, or opened on another
 * workspace's host (where the user is not found) — lands on /login instead.
 */
final class LoginHandoffController extends Controller
{
    public function __construct(
        private readonly ConsumeMagicLink $consumeMagicLink,
    ) {}

    public function __invoke(Request $request): RedirectResponse
    {
        $nonce = $request->query('nonce');
        $userId = $request->query('user');

        if (! $request->hasValidRelativeSignature() || ! is_string($nonce) || ! is_string($userId)) {
            return redirect('/login');
        }

        try {
            $this->consumeMagicLink->handle($nonce, $userId);
        } catch (RuntimeException) {
            // Used, expired, or not a user of this workspace. Anything else
            // (the database down) is a real error and goes to the handler.
            return redirect('/login');
        }

        // Rotate the session ID to prevent session-fixation attacks.
        $request->session()->regenerate();

        return redirect('/setup');
    }
}
