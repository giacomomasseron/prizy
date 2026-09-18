<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\User;
use App\Services\HelpdeskAccess;
use App\Services\MarkdownRenderer;

final class PreviewKbMarkdown
{
    public function __construct(private readonly MarkdownRenderer $markdown) {}

    public function handle(User $actor, string $body): string
    {
        HelpdeskAccess::gate($actor);

        return $this->markdown->render($body);
    }
}
