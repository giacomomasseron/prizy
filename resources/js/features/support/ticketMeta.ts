import type { TicketStatus, TicketPriority, TicketChannel } from '../../lib/types';

export const TICKET_STATUS: Record<TicketStatus, { label: string; color: string }> = {
    new:     { label: 'New',     color: 'var(--blue)' },
    open:    { label: 'Open',    color: 'var(--red)' },
    pending: { label: 'Pending', color: 'var(--amber)' },
    on_hold: { label: 'On hold', color: 'var(--fg2)' },
    solved:  { label: 'Solved',  color: 'var(--green)' },
    closed:  { label: 'Closed',  color: 'var(--fg3)' },
};

export const TICKET_PRIORITY: Record<TicketPriority, { label: string; bars: number }> = {
    low:    { label: 'Low',    bars: 1 },
    normal: { label: 'Normal', bars: 2 },
    high:   { label: 'High',   bars: 3 },
    urgent: { label: 'Urgent', bars: 0 }, // rendered as the ! chip
};

export const TICKET_CHANNEL: Record<TicketChannel, { label: string; icon: string }> = {
    email:  { label: 'Email',  icon: '✉' },
    chat:   { label: 'Chat',   icon: '💬' },
    portal: { label: 'Portal', icon: '🌐' },
    api:    { label: 'API',    icon: '⚙' },
};
