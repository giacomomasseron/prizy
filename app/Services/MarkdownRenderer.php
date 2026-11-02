<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Str;

/**
 * The ONLY markdown → html producer for KB content: the public article page
 * and the authoring preview both render through here, so what an agent
 * previews is byte-for-byte what a customer gets. Safe mode: raw HTML in the
 * body is escaped, not rendered; javascript:/data: links are dropped.
 */
final class MarkdownRenderer
{
    public function render(string $markdown): string
    {
        return (string) Str::markdown($markdown, ['html_input' => 'escape', 'allow_unsafe_links' => false]);
    }
}
