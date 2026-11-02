<?php

declare(strict_types=1);

namespace App\UseCases\Tickets;

use App\Models\Ticket;
use App\Models\User;
use App\Repositories\TicketRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * @method Ticket run(User $actor, string $id)
 */
final class FindTicket extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly TicketRepository $tickets) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    private function execute(User $actor, string $id): Ticket
    {
        HelpdeskAccess::gate($actor);

        $ticket = $this->tickets->find($id); // WorkspaceScope → cross-workspace id yields null

        if ($ticket === null) {
            throw (new ModelNotFoundException)->setModel(Ticket::class, [$id]);
        }

        return $ticket;
    }
}
