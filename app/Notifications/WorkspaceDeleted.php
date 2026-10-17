<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Notifications\Concerns\EscapesMarkdown;
use DateTimeInterface;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells every owner of a workspace that it was deleted, by whom and when: the
 * record of an act nothing in the app can show any more, and the first sign of
 * it if an owner's account was used by someone else.
 */
final class WorkspaceDeleted extends Notification
{
    use EscapesMarkdown;

    public function __construct(
        public readonly string $workspaceName,
        public readonly string $address,
        public readonly string $deletedByName,
        public readonly string $deletedByEmail,
        public readonly DateTimeInterface $deletedAt,
    ) {}

    public function via(mixed $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        $who = self::literal($this->deletedByName).' ('.self::literal($this->deletedByEmail).')';
        $what = self::literal($this->workspaceName).' ('.self::literal($this->address).')';
        $when = $this->deletedAt->format('j F Y \a\t H:i T');

        return (new MailMessage())
            ->subject('Your Prizy workspace was deleted')
            ->line("{$who} deleted the Prizy workspace {$what} on {$when}.")
            ->line('Every issue, ticket, article and member in it was deleted with it, and its address is free again.')
            ->line("If nobody meant to delete it, the account that did may be in someone else's hands.");
    }
}
