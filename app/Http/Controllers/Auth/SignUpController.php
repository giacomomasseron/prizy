<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
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
            'slug'           => ['required', 'string', 'max:63', 'unique:workspaces,slug'],
            'name'           => ['required', 'string', 'max:255'],
            'email'          => ['required', 'email', 'max:255'],
            'password'       => ['required', 'string', Password::defaults()],
        ]);

        $result = $this->signUpWorkspace->handle($data);

        return response()->json([
            'workspace' => $result['workspace'],
            'user'      => $result['user']->only([
                'id', 'workspace_id', 'name', 'email', 'admin_level',
                'is_developer', 'is_agent', 'timezone', 'locale', 'created_at',
            ]),
        ], 201);
    }
}
