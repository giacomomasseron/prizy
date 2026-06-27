<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\UseCases\Members\AcceptInvite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

/**
 * Landlord controller — exempt from NeedsTenant + EnsureValidTenantSession.
 *
 * The invitee posts their name and password here with the raw token from the
 * invite email. There is no current workspace; the invite is looked up by
 * token hash (RLS is permissive when the GUC is unset).
 */
final class AcceptInviteController extends Controller
{
    public function __construct(
        private readonly AcceptInvite $acceptInvite,
    ) {}

    public function store(Request $request, string $token): JsonResponse
    {
        $data = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', Password::defaults()],
        ]);

        $user = $this->acceptInvite->handle($token, $data);

        // Rotate the session ID after the invite is accepted to prevent
        // session fixation (the invitee now holds an authenticated session).
        $request->session()->regenerate();

        return response()->json([
            'user' => $user->only([
                'id', 'workspace_id', 'name', 'email',
                'admin_level', 'is_developer', 'is_agent',
            ]),
        ]);
    }
}
