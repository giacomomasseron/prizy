<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Ticket;
use Illuminate\Database\Eloquent\Collection;

final class TicketRepository
{
    /**
     * @param  array<string, string>  $filters  field => CSV value (assignee_id supports the 'none' sentinel)
     * @return Collection<int, Ticket>
     */
    public function forWorkspace(string $workspaceId, array $filters = []): Collection
    {
        $query = Ticket::query()
            ->where('workspace_id', $workspaceId)
            ->with(['requester.contactMetadata', 'assignee', 'tags', 'linkedIssues', 'slaPolicy', 'slaPolicy.schedule.businessHourIntervals', 'slaBreaches']);

        // tag_id: tickets having ANY of the given tags (junction subquery).
        if (isset($filters['tag_id'])) {
            $tagIds = array_filter(array_map('trim', explode(',', $filters['tag_id'])));
            unset($filters['tag_id']);
            if ($tagIds !== []) {
                $query->whereIn('id', function ($sub) use ($tagIds): void {
                    $sub->select('ticket_id')->from('ticket_tags')->whereIn('tag_id', $tagIds);
                });
            }
        }

        // assignee_id: 'none' sentinel → unassigned; else CSV of user ids.
        if (isset($filters['assignee_id'])) {
            $value = $filters['assignee_id'];
            unset($filters['assignee_id']);
            if ($value === 'none') {
                $query->whereNull('assignee_id');
            } else {
                $query->whereIn('assignee_id', array_filter(array_map('trim', explode(',', $value))));
            }
        }

        // status, channel: plain whereIn over the CSV.
        foreach ($filters as $field => $value) {
            $query->whereIn($field, array_filter(array_map('trim', explode(',', $value))));
        }

        return $query->orderByDesc('updated_at')->get();
    }

    public function find(string $id): ?Ticket
    {
        return Ticket::query()
            ->with([
                'requester.contactMetadata', 'assignee', 'tags', 'linkedIssues', 'slaPolicy', 'slaPolicy.schedule.businessHourIntervals', 'slaBreaches',
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
