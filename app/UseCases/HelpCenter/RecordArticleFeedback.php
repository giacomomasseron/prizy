<?php

declare(strict_types=1);

namespace App\UseCases\HelpCenter;

use App\Models\KbArticle;
use App\Repositories\KbRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Public help-center read — no actor: the pages are unauthenticated (CSAT precedent).
 */
final class RecordArticleFeedback
{
    private const VALID_VOTES = ['up', 'down'];

    public function __construct(private readonly KbRepository $kb) {}

    public function handle(string $articleId, string $vote): void
    {
        $article = $this->kb->findPublishedById($articleId);
        if ($article === null) {
            throw (new ModelNotFoundException)->setModel(KbArticle::class, [$articleId]);
        }

        if (! in_array($vote, self::VALID_VOTES, true)) {
            return;
        }

        $this->kb->recordFeedback($article, $vote === 'up');
    }
}
