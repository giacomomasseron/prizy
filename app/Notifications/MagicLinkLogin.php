<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Carries a signed, single-use 15-minute login URL to the user's inbox.
 *
 * The `url` property is intentionally public so that test suites using
 * Notification::fake() can inspect the generated URL via assertSentTo callbacks
 * without needing to decode mail message internals.
 */
class MagicLinkLogin extends Notification
{
    public function __construct(
        public readonly string $url,
    ) {}

    /**
     * @return list<string>
     */
    public function via(mixed $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        return (new MailMessage())
            ->subject('Your Prizy login link')
            ->line('Click the button below to sign in to your workspace.')
            ->action('Log In to Prizy', $this->url)
            ->line('This link expires in 15 minutes and can only be used once.')
            ->line('If you did not request this link, you can safely ignore this email.');
    }
}
