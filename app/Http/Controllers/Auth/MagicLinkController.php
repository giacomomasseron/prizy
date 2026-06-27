<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\UseCases\Auth\ConsumeMagicLink;
use App\UseCases\Auth\RequestMagicLink;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Handles passwordless magic-link authentication.
 *
 * request() — tenant route: resolves user within the host workspace.
 * consume() — landlord route: signed URL, exempt from NeedsTenant/tenant.session.
 */
final class MagicLinkController extends Controller
{
    public function __construct(
        private readonly RequestMagicLink $requestMagicLink,
        private readonly ConsumeMagicLink $consumeMagicLink,
    ) {}

    /**
     * Send a magic-link login email to the given address.
     *
     * Always returns 202 regardless of whether the address is registered — this
     * prevents leaking which email addresses exist in a workspace (no enumeration).
     * "Forgot password" is the same endpoint; no separate flow is needed.
     */
    public function request(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $this->requestMagicLink->handle($data['email']);

        return response()->json(
            ['message' => 'If that email is registered, a login link is on its way.'],
            202
        );
    }

    /**
     * Consume a magic-link nonce and establish a session.
     *
     * The `signed` middleware validates the URL signature before this method is
     * reached; an invalid or tampered signature aborts with 403 automatically.
     *
     * On a valid (unexpired, unused) nonce the user is logged in and the session
     * ID is rotated to prevent session-fixation attacks.
     *
     * On an invalid / already-used nonce the handler aborts with 401.
     */
    public function consume(Request $request): JsonResponse
    {
        $nonce  = (string) $request->query('nonce', '');
        $userId = (string) $request->query('user', '');

        try {
            $user = $this->consumeMagicLink->handle($nonce, $userId);
        } catch (\Throwable) {
            abort(401, 'Invalid or expired magic link.');
        }

        // Rotate the session ID to prevent session-fixation attacks.
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Logged in successfully.',
            'user'    => $user->only([
                'id', 'workspace_id', 'name', 'email', 'admin_level',
                'is_developer', 'is_agent', 'timezone', 'locale',
                'email_verified_at', 'last_seen_at', 'created_at',
            ]),
        ]);
    }
}
