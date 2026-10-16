<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Rules\WorkspaceSlug;
use App\UseCases\Auth\SignUpWorkspace;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\Rules\Password;

final class SignUpController extends Controller
{
    /** Per address, per hour: each sign-up sends a verification email. */
    private const SIGNUPS_PER_HOUR = 10;

    public function __construct(
        private readonly SignUpWorkspace $signUpWorkspace,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate([
            'workspace_name' => ['required', 'string', 'max:255'],
            // bail: a malformed or reserved slug needs no uniqueness query.
            'slug'           => ['bail', 'required', 'string', new WorkspaceSlug(), 'unique:workspaces,slug'],
            'name'           => ['required', 'string', 'max:255'],
            'email'          => ['required', 'email', 'max:255'],
            'password'       => ['required', 'string', Password::defaults()],
        ]);

        // Counted after validation, so a taken or mistyped slug costs nothing
        // here; the route's per-minute throttle covers every attempt.
        $key = 'signups:'.$request->ip();
        if (RateLimiter::tooManyAttempts($key, self::SIGNUPS_PER_HOUR)) {
            throw new ThrottleRequestsException('Too many sign-ups.', null, ['Retry-After' => RateLimiter::availableIn($key)]);
        }
        RateLimiter::hit($key, 3600);

        $result = $this->signUpWorkspace->handle($data);

        // Rotate the session ID after signup to prevent session fixation:
        // a planted (pre-signup) session ID must not survive authentication.
        $request->session()->regenerate();

        return response()->json([
            'activation_required' => $result['activation_required'],
            'workspace_url'       => $result['workspace_url'],
            'workspace' => $result['workspace'],
            'user'      => $result['user']->only([
                'id', 'workspace_id', 'name', 'email', 'admin_level',
                'is_developer', 'is_agent', 'timezone', 'locale', 'created_at',
            ]),
        ], 201);
    }
}
