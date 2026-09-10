<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Contact;
use App\Models\Ticket;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;

final class PortalTicketRepository
{
    /** Portal-facing status vocabulary (the mockup's customer labels). */
    public const STATUS_LABELS = [
        'new' => 'Received', 'open' => 'In progress',
        'pending' => 'Awaiting you', 'on_hold' => 'Awaiting you',
        'solved' => 'Solved', 'closed' => 'Solved',
    ];

    /**
     * The contact's own tickets, newest activity first, each with an
     * `unread` attribute: a PUBLIC agent message newer than contact_seen_at
     * (or any at all when never seen). One query, no N+1.
     *
     * @return Collection<int, Ticket>
     */
    public function forContact(Contact $contact, string $filter = 'all', string $q = ''): Collection
    {
        $query = Ticket::query()
            ->where('requester_id', $contact->id)
            ->with('assignee')
            ->selectRaw('tickets.*, EXISTS('
                .'SELECT 1 FROM ticket_messages m WHERE m.ticket_id = tickets.id'
                ." AND m.is_internal = false AND m.sender_type = 'user'"
                .' AND (tickets.contact_seen_at IS NULL OR m.created_at > tickets.contact_seen_at)'
                .') AS unread')
            ->orderByDesc('updated_at');

        if ($filter === 'open') {
            $query->whereNotIn('status', ['solved', 'closed']);
        } elseif ($filter === 'solved') {
            $query->whereIn('status', ['solved', 'closed']);
        }
        $q = trim($q);
        if ($q !== '') {
            $query->where(fn ($w) => $w
                ->where('subject', 'ilike', "%{$q}%")
                ->orWhereRaw('left(tickets.id::text, 8) ilike ?', ["%{$q}%"]));
        }

        return $query->get();
    }

    /** @return array{all: int, open: int, solved: int} */
    public function countsFor(Contact $contact): array
    {
        $rows = Ticket::query()->where('requester_id', $contact->id)
            ->selectRaw("count(*) FILTER (WHERE status NOT IN ('solved','closed')) AS open_c, count(*) AS all_c")
            ->first();

        return [
            'all' => (int) $rows->all_c,
            'open' => (int) $rows->open_c,
            'solved' => (int) $rows->all_c - (int) $rows->open_c,
        ];
    }

    public function findOwn(Contact $contact, string $ticketId): ?Ticket
    {
        return Ticket::query()->where('requester_id', $contact->id)
            ->with(['assignee'])->find($ticketId);
    }

    /**
     * Public conversation: non-internal messages + derived events, merged by
     * timestamp. Each item: ['kind' => 'message'|'event', ...].
     *
     * @return list<array<string, mixed>>
     */
    public function conversation(Ticket $ticket): array
    {
        $items = [];
        foreach ($ticket->ticketMessages()->where('is_internal', false)->with(['senderUser', 'senderContact'])->orderBy('created_at')->get() as $m) {
            $items[] = [
                'kind' => 'message', 'at' => $m->created_at,
                'mine' => $m->sender_type === 'contact',
                'name' => $m->sender_type === 'contact' ? ($m->senderContact?->name ?? 'You') : ($m->senderUser?->name ?? 'Support'),
                'body' => $m->body,
            ];
        }
        $items[] = ['kind' => 'event', 'at' => $ticket->created_at, 'icon' => '✓', 'label' => 'Request received'];
        $escalatedAt = $ticket->issueTicketLinks()->min('created_at');
        if ($escalatedAt !== null) {
            $items[] = ['kind' => 'event', 'at' => Carbon::parse($escalatedAt), 'icon' => '↗', 'label' => 'Escalated to our engineering team'];
        }
        if ($ticket->resolved_at !== null) {
            $items[] = ['kind' => 'event', 'at' => $ticket->resolved_at, 'icon' => '✓', 'label' => 'Request marked as solved'];
        }
        usort($items, fn (array $a, array $b): int => $a['at'] <=> $b['at']);

        return $items;
    }

    /** Stamp "seen" without touching updated_at (HC-1 counter lesson). */
    public function markSeen(Ticket $ticket): void
    {
        $ticket->timestamps = false;
        $ticket->forceFill(['contact_seen_at' => now()])->save();
        $ticket->timestamps = true;
    }
}
