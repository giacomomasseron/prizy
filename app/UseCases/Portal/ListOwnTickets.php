<?php

declare(strict_types=1);

namespace App\UseCases\Portal;

use App\Models\Contact;
use App\Models\Ticket;
use App\Repositories\PortalTicketRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * @method array run(Contact $actor, string $filter, string $q)
 */
final class ListOwnTickets extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly PortalTicketRepository $tickets) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @return array{tickets: Collection<int, Ticket>, counts: array{all: int, open: int, solved: int}} */
    private function execute(Contact $actor, string $filter, string $q): array
    {
        return [
            'tickets' => $this->tickets->forContact($actor, $filter, $q),
            'counts' => $this->tickets->countsFor($actor),
        ];
    }
}
