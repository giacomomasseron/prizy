<?php

declare(strict_types=1);

namespace App\UseCases\HelpCenter;

use App\Models\Contact;
use App\Models\KbArticle;
use App\Models\KbCategory;
use App\Models\Ticket;
use App\Repositories\KbRepository;
use App\Repositories\PortalTicketRepository;
use Illuminate\Database\Eloquent\Collection;

/**
 * Public help-center read — the page itself is unauthenticated (CSAT
 * precedent), but a signed-in contact additionally sees their 3 most recent
 * requests, so $contact is an optional add-on rather than a required actor.
 */
final class ShowHelpHome
{
    public function __construct(
        private readonly KbRepository $kb,
        private readonly PortalTicketRepository $portalTickets,
    ) {}

    /** @return array{categories: Collection<int, KbCategory>, suggestions: Collection<int, KbArticle>, recent: ?Collection<int, Ticket>} */
    public function handle(?Contact $contact = null): array
    {
        $suggestions = $this->kb->topArticles();
        // Each chip links to the article's full slug chain, which needs its
        // parent section+category — eager-load here (2 queries total) so the
        // view isn't tempted into an N+1 over $article->section->category.
        $suggestions->load('section.category');

        return [
            'categories' => $this->kb->categoriesWithCounts(),
            'suggestions' => $suggestions,
            'recent' => $contact !== null ? $this->portalTickets->forContact($contact)->take(3) : null,
        ];
    }
}
