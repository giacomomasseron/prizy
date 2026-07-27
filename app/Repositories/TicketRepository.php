<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Ticket;
use Illuminate\Database\Eloquent\Collection;

final class TicketRepository
{
    /** @return Collection<int, Ticket> */
    public function forWorkspace(string $workspaceId): Collection
    {
        return Ticket::query()
            ->where('workspace_id', $workspaceId)
            ->with(['requester.contactMetadata', 'assignee', 'tags', 'linkedIssues', 'slaPolicy', 'slaBreaches'])
            ->orderByDesc('updated_at')
            ->get();
    }

    public function find(string $id): ?Ticket
    {
        return Ticket::query()
            ->with([
                'requester.contactMetadata', 'assignee', 'tags', 'linkedIssues', 'slaPolicy', 'slaBreaches',
                'ticketMessages' => fn ($q) => $q->orderBy('created_at')->with(['senderUser', 'senderContact']),
            ])
            ->find($id);
    }

    /** @param array<string, mixed> $attributes */
    public function create(array $attributes): Ticket
    {
        return Ticket::create($attributes);
    }
}
