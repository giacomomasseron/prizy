<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Workspace;

/**
 * What every email on emails.layout needs, so each notification only adds its
 * own copy.
 */
final class DesignedEmail
{
    /**
     * @param  string  $host  The host the email's workspace card names and links to
     * @param  list<array{title: string, rest: string}>  $steps  Numbered in order; `title` is the bold part
     * @return array<string, mixed>
     */
    public static function data(Workspace $workspace, string $host, int $expiresInHours, array $steps): array
    {
        $name = self::singleLine($workspace->name);

        return [
            'workspaceName'    => $name,
            'workspaceInitial' => self::initial($name),
            'workspaceUrl'     => WorkspaceUrl::origin($host),
            'workspaceHost'    => $host,
            'expiresInHours'   => $expiresInHours,
            'steps'            => $steps,
            // Only the cloud's mail comes from the Prizy team. A self-hosted
            // install's comes from whoever runs it, who answers for it there.
            'onPrizyCloud'     => config('app.base_domain') === 'prizy.dev',
        ];
    }

    /**
     * Text someone typed, on one line. Escaping can't do this: a line break is
     * harmless in the HTML part, but in the plain-text part it lets a name add
     * lines that read as the email's own, such as a second link to click.
     */
    public static function singleLine(string $text): string
    {
        return trim((string) preg_replace('/[\s\p{Cc}\p{Zl}\p{Zp}]+/u', ' ', $text));
    }

    /**
     * The first character as a person sees it (\X keeps a flag or a joined emoji
     * whole), capitalised unless that makes it wider: "ß" would become "SS",
     * which doesn't fit the tile.
     */
    private static function initial(string $name): string
    {
        $first = preg_match('/\X/u', $name, $match) === 1 ? $match[0] : '';
        $upper = mb_strtoupper($first);

        return mb_strlen($upper) === mb_strlen($first) ? $upper : $first;
    }
}
