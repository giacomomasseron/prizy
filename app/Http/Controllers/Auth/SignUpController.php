<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Rules\WorkspaceSlug;
use App\UseCases\Auth\SignUpWorkspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

final class SignUpController extends Controller
{
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
