import type { TicketStatus } from '../../lib/types';

// Zendesk-style suggested next status for the composer's "Submit as {next}" button.
export const NEXT_STATUS: Record<TicketStatus, TicketStatus> = {
    new: 'open',
    open: 'pending',
    pending: 'solved',
    on_hold: 'open',
    solved: 'open',
    closed: 'open',
};

export function nextStatus(status: TicketStatus): TicketStatus {
    return NEXT_STATUS[status];
}

export interface Macro {
    label: string;
    text: string;
    /** Tells the customer about the engineering team: not offered in a workspace that has switched the tracker off. */
    tracker?: boolean;
}

// Client-side canned inserts — appended to the draft, no backend.
export const MACROS: Macro[] = [
    {
        label: '⚡ Ask for details',
        text: 'Could you share a few more details so we can dig in?\n\n• What were you doing when this happened?\n• Any error message or screenshot?\n• When did it start?',
    },
    {
        label: 'Escalate to eng',
        text: 'Thanks for your patience — I’ve escalated this to our engineering team and will update you as soon as I hear back.',
        tracker: true,
    },
    {
        label: 'Close as solved',
        text: 'Glad we could help! I’m marking this as solved — just reply if anything else comes up.',
    },
];
