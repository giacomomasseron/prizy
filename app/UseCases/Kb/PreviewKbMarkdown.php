<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\User;
use App\Services\HelpdeskAccess;
use App\Services\MarkdownRenderer;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method static string run(User $actor, string $body)
 */
final class PreviewKbMarkdown extends BaseUseCase implements UseCaseInterface
{
    private readonly MarkdownRenderer $markdown;

    public function handle(mixed ...$arguments): mixed
    {
        $this->markdown = app(MarkdownRenderer::class);

        return $this->execute(...$arguments);
    }

    private function execute(User $actor, string $body): string
    {
        HelpdeskAccess::gate($actor);

        return $this->markdown->render($body);
    }
}
