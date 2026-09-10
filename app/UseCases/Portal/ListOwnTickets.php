<?php

declare(strict_types=1);

namespace App\UseCases\Portal;

use App\Models\Contact;
use App\Models\Ticket;
use App\Repositories\PortalTicketRepository;
use Illuminate\Database\Eloquent\Collection;

final class ListOwnTickets
{
    public function __construct(private readonly PortalTicketRepository $tickets) {}

    /** @return array{tickets: Collection<int, Ticket>, counts: array{all: int, open: int, solved: int}} */
    public function handle(Contact $actor, string $filter, string $q): array
    {
        return [
            'tickets' => $this->tickets->forContact($actor, $filter, $q),
            'counts' => $this->tickets->countsFor($actor),
        ];
    }
}
