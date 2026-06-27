<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Dispatched on workspace signup to prompt the new owner to verify their email.
 * Task 7 completes the full verification flow (signed verify route, resend, gate).
 */
class VerifyEmail extends Notification
{
    public function via(mixed $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        return (new MailMessage())
            ->subject('Verify your email address')
            ->line('Welcome to Prizy! Please verify your email address to get started.')
            ->line('(Full verification link coming in Task 7.)');
    }
}
