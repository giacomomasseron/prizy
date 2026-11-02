<?php

declare(strict_types=1);

namespace App\Notifications\Concerns;

trait EscapesMarkdown
{
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
