<?php

declare(strict_types=1);

namespace App\UseCases\Auth;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Auth\MustVerifyEmail;

/**
 * Re-sends the email verification notification to the authenticated user.
 *
 * Accepts any Authenticatable that implements MustVerifyEmail so the controller
 * never needs to import the concrete User model (deptrac: Controller → UseCase only).
 */
final class ResendVerification
{
    public function handle(Authenticatable $user): void
    {
        if ($user instanceof MustVerifyEmail && ! $user->hasVerifiedEmail()) {
            $user->sendEmailVerificationNotification();
        }
    }
}
