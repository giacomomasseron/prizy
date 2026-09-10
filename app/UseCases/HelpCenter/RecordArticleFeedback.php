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

    /**
     * @return bool whether the vote was actually recorded — the controller
     *              uses this to decide whether the redirect shows the "thanks"
     *              state, instead of trusting an unconditional redirect param.
     */
    public function handle(string $articleId, mixed $vote): bool
    {
        $article = $this->kb->findPublishedById($articleId);
        if ($article === null) {
            throw (new ModelNotFoundException)->setModel(KbArticle::class, [$articleId]);
        }

        // $vote comes straight from request input, so it can be an array
        // (e.g. `vote[]=up`) — guard the type before the strict in_array()
        // comparison so a shaped payload is just an invalid vote, not a crash.
        if (! is_string($vote) || ! in_array($vote, self::VALID_VOTES, true)) {
            return false;
        }

        $this->kb->recordFeedback($article, $vote === 'up');

        return true;
    }
}
