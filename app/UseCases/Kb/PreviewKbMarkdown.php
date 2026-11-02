<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\User;
use App\Services\HelpdeskAccess;
use App\Services\MarkdownRenderer;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method string run(User $actor, string $body)
 */
final class PreviewKbMarkdown extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly MarkdownRenderer $markdown) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    private function execute(User $actor, string $body): string
    {
        HelpdeskAccess::gate($actor);

        return $this->markdown->render($body);
    }
}
