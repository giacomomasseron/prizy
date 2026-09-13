<?php

declare(strict_types=1);

namespace App\UseCases\HelpCenter;

use App\Models\Contact;
use App\Models\KbArticle;
use App\Models\KbCategory;
use App\Models\Ticket;
use App\Repositories\KbRepository;
use App\Repositories\KbTranslationRepository;
use App\Repositories\PortalTicketRepository;
use App\Services\KbLocales;
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
        private readonly KbTranslationRepository $translations,
    ) {}

    /** @return array{categories: Collection<int, KbCategory>, suggestions: Collection<int, KbArticle>, recent: ?Collection<int, Ticket>, lang: string} */
    public function handle(?Contact $contact = null, string $lang = KbLocales::SOURCE): array
    {
        $suggestions = $this->kb->topArticles();
        $this->translations->applyDisplayTitles($suggestions, $lang);

        return [
            'categories' => $this->kb->categoriesWithCounts(),
            'suggestions' => $suggestions,
            'recent' => $contact !== null ? $this->portalTickets->forContactRecent($contact) : null,
            'lang' => $lang,
        ];
    }
}
