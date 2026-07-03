<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NotificationDigest extends Notification
{
    /**
     * @param  list<array{text: string, url: string}>  $items
     */
    public function __construct(
        private readonly array $items,
        private readonly string $workspaceName,
    ) {}

    /** @return list<string> */
    public function via(mixed $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        $count = count($this->items);
        $mail = (new MailMessage())
            ->subject("You have {$count} new notification" . ($count === 1 ? '' : 's') . " in {$this->workspaceName}")
            ->line("Here's what's new in {$this->workspaceName}:");

        foreach ($this->items as $item) {
            $mail->line("• {$item['text']}: {$item['url']}");
        }

        return $mail->action('Open Prizy', $this->items[0]['url'] ?? '#');
    }
}
