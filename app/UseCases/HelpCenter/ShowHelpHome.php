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
        return [
            'categories' => $this->kb->categoriesWithCounts(),
            'suggestions' => $this->kb->topArticles(),
            'recent' => $contact !== null ? $this->portalTickets->forContactRecent($contact) : null,
        ];
    }
}
