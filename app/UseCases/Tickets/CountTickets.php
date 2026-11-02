<?php

declare(strict_types=1);

namespace App\UseCases\Tickets;

use App\Models\User;
use App\Repositories\TicketRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method static array run(User $actor)
 */
final class CountTickets extends BaseUseCase implements UseCaseInterface
{
    private readonly TicketRepository $tickets;

    public function handle(mixed ...$arguments): mixed
    {
        $this->tickets = app(TicketRepository::class);

        return $this->execute(...$arguments);
    }

    /**
     * @return array{by_status: array<string, int>, by_channel: array<string, int>, unassigned: int, mine_unsolved: int}
     */
    private function execute(User $actor): array
    {
        HelpdeskAccess::gate($actor);

        return $this->tickets->counts($actor->workspace_id, $actor->id);
    }
}
