<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbArticle;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method static KbArticle run(User $actor, string $id, string $direction)
 */
final class MoveKbArticle extends BaseUseCase implements UseCaseInterface
{
    private readonly KbAuthoringRepository $kb;

    public function handle(mixed ...$arguments): mixed
    {
        $this->kb = app(KbAuthoringRepository::class);

        return $this->execute(...$arguments);
    }

    private function execute(User $actor, string $id, string $direction): KbArticle
    {
        HelpdeskAccess::gateWrite($actor);
        $article = $this->kb->findArticle($id);
        abort_unless($article !== null, 404);
        $this->kb->moveArticle($article, $direction);

        return $this->kb->findArticle($id);
    }
}
