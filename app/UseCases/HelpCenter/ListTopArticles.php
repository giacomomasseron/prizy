<?php

declare(strict_types=1);

namespace App\UseCases\HelpCenter;

use App\Models\KbArticle;
use App\Repositories\KbRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * Public read: the most-viewed published articles, eager-loaded for URL building.
 *
 * @method static Collection run(int $limit = 4)
 */
final class ListTopArticles extends BaseUseCase implements UseCaseInterface
{
    private readonly KbRepository $kb;

    public function handle(mixed ...$arguments): mixed
    {
        $this->kb = app(KbRepository::class);

        return $this->execute(...$arguments);
    }

    /** @return Collection<int, KbArticle> */
    private function execute(int $limit = 4): Collection
    {
        return $this->kb->topArticles($limit);
    }
}
