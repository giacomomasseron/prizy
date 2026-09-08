<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Asks a ticket's requester how the resolution went — two signed one-click
 * rating links (👍/👎), valid 14 days, re-clickable to change the answer.
 *
 * Properties are intentionally public so Notification::fake() tests can
 * inspect the signed URLs without decoding mail message internals (same
 * pattern as MagicLinkLogin).
 */
class CsatRequest extends Notification
{
    public function __construct(
        public readonly string $upUrl,
        public readonly string $downUrl,
        public readonly string $ticketSubject,
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
        // Two rating links as markdown lines — MailMessage::action() renders
        // only a single button, and CSAT needs both choices equally visible.
        return (new MailMessage)
            ->subject('How did we do? — '.$this->ticketSubject)
            ->line('Your ticket "'.$this->ticketSubject.'" has been resolved. How was our support?')
            ->line('[👍 Good, I\'m satisfied]('.$this->upUrl.')')
            ->line('[👎 Poor, I\'m unsatisfied]('.$this->downUrl.')')
            ->line('These links work for 14 days — click again any time to change your answer.');
    }
}
