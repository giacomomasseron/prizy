import type { Issue } from '../../lib/types';

/**
 * "↩ TKT-…": the support ticket an issue came from, on list rows and (smaller) on board cards. Nothing for an issue
 * without one.
 */
export function TicketChip({ ticket, size = 'row' }: { ticket: Issue['support_ticket']; size?: 'row' | 'card' }) {
    if (!ticket) return null;
    const card = size === 'card';

    return (
        <span
            data-testid="ticket-chip"
            title={ticket.subject}
            style={{
                display: 'inline-flex', alignItems: 'center', flexShrink: 0, whiteSpace: 'nowrap',
                padding: card ? '1px 6px' : '2px 7px', borderRadius: card ? 5 : 6,
                background: 'var(--accent2)', color: 'var(--accent-ink)',
                fontSize: card ? 10 : 10.5, fontWeight: 600, fontFamily: 'var(--font-mono)',
            }}
        >
            ↩ {ticket.ref}
        </span>
    );
}
