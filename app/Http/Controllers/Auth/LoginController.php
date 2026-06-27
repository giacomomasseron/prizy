<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\UseCases\Auth\LogIn;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

final class LoginController extends Controller
{
    public function __construct(
        private readonly LogIn $logIn,
    ) {}

    /**
     * Authenticate the user within the current workspace.
     *
     * Validates email + password, delegates to the LogIn use case, and returns
     * the authenticated user (without sensitive fields) on success.
     * Returns 422 if credentials are invalid.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = $this->logIn->handle($data['email'], $data['password']);

        return response()->json([
            'user' => $user->only([
                'id', 'workspace_id', 'name', 'email', 'admin_level',
                'is_developer', 'is_agent', 'timezone', 'locale',
                'email_verified_at', 'last_seen_at', 'created_at',
            ]),
        ]);
    }

    /**
     * Log the user out: clear the session and invalidate the CSRF token.
     */
    public function destroy(Request $request): JsonResponse
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out.']);
    }
}
