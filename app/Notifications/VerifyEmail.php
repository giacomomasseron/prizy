<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Workspace;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

/**
 * Dispatched on workspace signup and on resend to let the user verify their email.
 * Generates a signed temporary URL pointing to the landlord verification route.
 */
class VerifyEmail extends Notification
{
    public function via(mixed $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        $verifyUrl = URL::temporarySignedRoute(
            'verification.verify',
            // As long as a pending sign-up waits: its owner cannot log in to
            // ask for a fresh link until this one has activated the workspace.
            now()->addHours(Workspace::ACTIVATION_WINDOW_HOURS),
            [
                'id'   => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ]
        );

        return (new MailMessage())
            ->subject('Verify your email address')
            ->line('Welcome to Prizy! Please verify your email address to get started.')
            ->action('Verify Email', $verifyUrl);
    }
}
