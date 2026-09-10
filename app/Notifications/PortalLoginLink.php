<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Carries a signed, single-use 15-minute portal sign-in link to a contact.
 * `url` is public so Notification::fake() tests can inspect it (house pattern).
 */
class PortalLoginLink extends Notification
{
    public function __construct(public readonly string $url) {}

    /** @return list<string> */
    public function via(mixed $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your sign-in link')
            ->line('Click below to view your support requests.')
            ->action('Sign in', $this->url)
            ->line('This link expires in 15 minutes and can only be used once.')
            ->line("If you didn't request it, you can safely ignore this email.");
    }
}
