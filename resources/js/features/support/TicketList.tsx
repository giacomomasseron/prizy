import type { TicketListItem } from '../../lib/types';

// Placeholder stub — Task 7 replaces this with the real ticket list pane.
export function TicketList({ tickets, selectedId, onSelect }: { tickets: TicketListItem[]; selectedId: string | undefined; onSelect: (id: string) => void }) {
    void tickets;
    void selectedId;
    void onSelect;
    return null;
}
