<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\User;
use App\Services\MarkdownRenderer;

final class PreviewKbMarkdown
{
    public function __construct(private readonly MarkdownRenderer $markdown) {}

    public function handle(User $actor, string $body): string
    {
        abort_unless($actor->is_agent, 403);

        return $this->markdown->render($body);
    }
}
