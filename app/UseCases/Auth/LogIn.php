<?php

declare(strict_types=1);

namespace App\UseCases\Auth;

use App\Models\User;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * @method static User run(string $email, string $password)
 */
final class LogIn extends BaseUseCase implements UseCaseInterface
{
    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /**
     * Verify credentials within the current workspace and log the user in.
     *
     * The WorkspaceScope global scope on User ensures the query is already
     * limited to the host-resolved workspace; no extra filtering is needed.
     *
     * @throws ValidationException when email is not found or password does not match.
     */
    private function execute(string $email, string $password): User
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
