<?php

declare(strict_types=1);

namespace App\UseCases\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

final class LogIn
{
    /**
     * Verify credentials within the current workspace and log the user in.
     *
     * The WorkspaceScope global scope on User ensures the query is already
     * limited to the host-resolved workspace; no extra filtering is needed.
     *
     * @throws ValidationException when email is not found or password does not match.
     */
    public function handle(string $email, string $password): User
    {
        $user = User::where('email', $email)->first();

        if ($user === null || ! Hash::check($password, $user->password_hash)) {
            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        Auth::login($user);

        $user->forceFill(['last_seen_at' => now()])->save();

        return $user;
    }
}
