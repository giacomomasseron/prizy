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
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * Public help-center read — the page itself is unauthenticated (CSAT
 * precedent), but a signed-in contact additionally sees their 3 most recent
 * requests, so $contact is an optional add-on rather than a required actor.
 *
 * @method array run(?Contact $contact = null, string $lang = KbLocales::SOURCE)
 */
final class ShowHelpHome extends BaseUseCase implements UseCaseInterface
{
    public function __construct(
        private readonly KbRepository $kb,
        private readonly PortalTicketRepository $portalTickets,
        private readonly KbTranslationRepository $translations,
    ) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** How many of the most-viewed articles the home page lists; the first SUGGESTIONS of them are also the chips under the search. */
    private const POPULAR = 6;

    private const SUGGESTIONS = 4;

    /** @return array{categories: Collection<int, KbCategory>, suggestions: Collection<int, KbArticle>, popular: Collection<int, KbArticle>, recent: ?Collection<int, Ticket>, recentTotal: int, lang: string} */
    private function execute(?Contact $contact = null, string $lang = KbLocales::SOURCE): array
    {
        $popular = $this->kb->topArticles(self::POPULAR);
        $this->translations->applyDisplayTitles($popular, $lang);

        return [
            'categories' => $this->kb->categoriesWithCounts(),
            'suggestions' => $popular->take(self::SUGGESTIONS)->values(),
            'popular' => $popular,
            'recent' => $contact !== null ? $this->portalTickets->forContactRecent($contact) : null,
            // Every request the contact has, for the "View all N" link over the three shown.
            'recentTotal' => $contact !== null ? $this->portalTickets->countsFor($contact)['all'] : 0,
            'lang' => $lang,
        ];
    }
}
