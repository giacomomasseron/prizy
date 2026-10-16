<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\UseCases\Auth\MarkEmailVerified;
use App\UseCases\Auth\ResendVerification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class EmailVerificationController extends Controller
{
    public function __construct(
        private readonly MarkEmailVerified $markEmailVerified,
        private readonly ResendVerification $resendVerification,
    ) {}

    /**
     * Handle a signed email verification link click.
     *
     * This is a LANDLORD route (no NeedsTenant / EnsureValidTenantSession middleware).
     * The user may arrive on any device or host with no tenant session — the
     * WorkspaceScope passes through (no workspace current) and RLS is permissive
     * when app.current_workspace_id is unset.
     *
     * The `signed` middleware validates the URL signature before this method runs;
     * an invalid signature aborts with 403 before we are reached.
     *
     * The link is clicked from a mail client, so it lands on the workspace
     * (logged in, when this click is the one that activated it).
     */
    public function verify(Request $request, string $id, string $hash): RedirectResponse
    {
        $destination = $this->markEmailVerified->handle($id, $hash);

        if ($destination === null) {
            abort(403, 'Invalid verification link.');
        }

        return redirect()->away($destination);
    }

    /**
     * Resend the verification email to the currently authenticated user.
     */
    public function resend(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user === null) {
            abort(401);
        }

        $this->resendVerification->handle($user);

        return response()->json(['message' => 'Verification link sent.']);
    }
}
