<?php

declare(strict_types=1);

namespace App\UseCases\Tickets;

use App\Models\User;
use App\Repositories\TicketRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Pagination\CursorPaginator;

/**
 * @method CursorPaginator run(User $actor, array $filters = [], string $sort = 'updated_at', int $limit = 25)
 */
final class ListTickets extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly TicketRepository $tickets) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /**
     * @param  array<string, string>  $filters
     */
    private function execute(User $actor, array $filters = [], string $sort = 'updated_at', int $limit = 25): CursorPaginator
    {
        HelpdeskAccess::gate($actor);

        return $this->tickets->forWorkspace($actor->workspace_id, $filters, $sort, $limit);
    }
}
