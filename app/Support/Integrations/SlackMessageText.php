<?php

declare(strict_types=1);

namespace App\Support\Integrations;

final class SlackMessageText
{
    public static function url(string $slug, string $issueId): string
    {
        $scheme = str_starts_with((string) config('app.url'), 'https') ? 'https' : 'http';

        return "{$scheme}://{$slug}." . config('app.base_domain') . "/issues/{$issueId}";
    }

    public static function build(string $key, string $title, string $url, ?string $status = null): string
    {
        return match ($key) {
            'created'        => ":sparkles: *{$title}* was created — {$url}",
            'status_changed' => ":arrows_counterclockwise: *{$title}* → *{$status}* — {$url}",
            'assigned'       => ":bust_in_silhouette: *{$title}* was assigned — {$url}",
            'commented'      => ":speech_balloon: New comment on *{$title}* — {$url}",
            default          => "*{$title}* — {$url}",
        };
    }
}
