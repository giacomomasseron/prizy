<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Ticket;
use Illuminate\Pagination\CursorPaginator;

final class TicketRepository
{
    /**
     * @param  array<string, string>  $filters  field => CSV value (assignee_id supports the 'none' sentinel)
     */
    public function forWorkspace(string $workspaceId, array $filters = [], string $sort = 'updated_at', int $limit = 25): CursorPaginator
    {
        $query = Ticket::query()
            ->where('workspace_id', $workspaceId)
            ->with(['requester.contactMetadata', 'assignee', 'tags', 'linkedIssues', 'slaPolicy', 'slaPolicy.schedule.businessHourIntervals', 'slaBreaches', 'latestPublicMessage']);

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

        if ($sort === 'sla_due') {
            $query->whereNotNull('first_reply_due_at')->orderBy('first_reply_due_at', 'asc');
        } elseif ($sort === 'priority') {
            $query->orderBy('priority', 'desc');
        } elseif ($sort === 'created_at') {
            $query->orderBy('created_at', 'desc');
        } else {
            $query->orderBy('updated_at', 'desc');
        }

        return $query->orderBy('id')->cursorPaginate(perPage: $limit, cursorName: 'after')->withQueryString();
    }

    public function find(string $id): ?Ticket
    {
        return Ticket::query()
            ->with([
                'requester.contactMetadata', 'assignee', 'tags', 'linkedIssues', 'slaPolicy', 'slaPolicy.schedule.businessHourIntervals', 'slaBreaches', 'latestPublicMessage',
                'ticketMessages' => fn ($q) => $q->orderBy('created_at')->with(['senderUser', 'senderContact']),
            ])
            ->find($id);
    }

    /** @param array<string, mixed> $attributes */
    public function create(array $attributes): Ticket
    {
        return Ticket::create($attributes);
    }

    /**
     * @return array{by_status: array<string, int>, by_channel: array<string, int>, unassigned: int, mine_unsolved: int}
     */
    public function counts(string $workspaceId, string $actorId): array
    {
        $statuses = ['new', 'open', 'pending', 'on_hold', 'solved', 'closed'];
        $channels = ['email', 'chat', 'portal', 'api'];

        $byStatus = Ticket::query()->where('workspace_id', $workspaceId)
            ->selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status');
        $byChannel = Ticket::query()->where('workspace_id', $workspaceId)
            ->selectRaw('channel, count(*) as c')->groupBy('channel')->pluck('c', 'channel');

        return [
            'by_status' => collect($statuses)->mapWithKeys(fn ($s) => [$s => (int) ($byStatus[$s] ?? 0)])->all(),
            'by_channel' => collect($channels)->mapWithKeys(fn ($c) => [$c => (int) ($byChannel[$c] ?? 0)])->all(),
            'unassigned' => Ticket::query()->where('workspace_id', $workspaceId)->whereNull('assignee_id')->count(),
            'mine_unsolved' => Ticket::query()->where('workspace_id', $workspaceId)
                ->where('assignee_id', $actorId)->whereIn('status', ['new', 'open', 'pending', 'on_hold'])->count(),
        ];
    }
}
