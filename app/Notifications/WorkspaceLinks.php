<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * "Find your workspace": the login link of each workspace an address belongs to.
 */
final class WorkspaceLinks extends Notification
{
    /**
     * @param  list<array{name: string, url: string}>  $workspaces
     */
    public function __construct(
        public readonly array $workspaces,
    ) {}

    public function via(mixed $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        $mail = (new MailMessage())
            ->subject('Your Prizy workspaces')
            ->line('This address has an account in these Prizy workspaces. Open one to log in:');

        foreach ($this->workspaces as $workspace) {
            $mail->line(self::literal($workspace['name']).": {$workspace['url']}");
        }

        return $mail->line("If you didn't ask for this, you can ignore this email.");
    }

    /**
     * Mail lines are Markdown and workspace names are whatever their owners
     * typed: escape what would turn a name into a link, emphasis, a heading or
     * a list item in a Prizy-branded email.
     */
    private static function literal(string $text): string
    {
        // Not < or >: the mail template HTML-escapes those first, and a
        // backslash before the entity would print a literal "&lt;".
        $text = preg_replace('/([\\\\`*_\[\]()!#|~])/', '\\\\$1', $text);
        $text = preg_replace('/^([-+])/', '\\\\$1', $text);

        return preg_replace('/^(\d+)([.)])/', '$1\\\\$2', $text);
    }
}
