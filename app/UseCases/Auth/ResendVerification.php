<?php

declare(strict_types=1);

namespace App\UseCases\Auth;

use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Auth\MustVerifyEmail;

/**
 * Re-sends the email verification notification to the authenticated user.
 *
 * Accepts any Authenticatable that implements MustVerifyEmail so the controller
 * never needs to import the concrete User model (deptrac: Controller → UseCase only).
 *
 * @method static void run(Authenticatable $user)
 */
final class ResendVerification extends BaseUseCase implements UseCaseInterface
{
    public function handle(mixed ...$arguments): mixed
    {
        $this->execute(...$arguments);

        return null;
    }

    private function execute(Authenticatable $user): void
    {
        if ($user instanceof MustVerifyEmail && ! $user->hasVerifiedEmail()) {
            $user->sendEmailVerificationNotification();
        }
    }
}
