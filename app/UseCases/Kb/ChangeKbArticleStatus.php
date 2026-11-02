<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbArticle;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Validation\ValidationException;

/**
 * @method static KbArticle run(User $actor, string $id, string $status)
 */
final class ChangeKbArticleStatus extends BaseUseCase implements UseCaseInterface
{
    private readonly KbAuthoringRepository $kb;

    public function handle(mixed ...$arguments): mixed
    {
        $this->kb = app(KbAuthoringRepository::class);

        return $this->execute(...$arguments);
    }

    /** @param 'draft'|'published'|'archived' $status */
    private function execute(User $actor, string $id, string $status): KbArticle
    {
        HelpdeskAccess::gateWrite($actor);
        $article = $this->kb->findArticle($id);
        abort_unless($article !== null, 404);

        if ($article->status !== $status) {
            if ($status === 'published' && trim($article->body) === '') {
                throw ValidationException::withMessages(['status' => ['Add some content before publishing.']]);
            }
            $article->status = $status;
            // First publish only — an unpublish → republish keeps the original date.
            if ($status === 'published' && $article->published_at === null) {
                $article->published_at = now();
            }
            $article->save();
        }

        return $article;
    }
}
