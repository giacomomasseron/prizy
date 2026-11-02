import type { CSSProperties } from 'react';
import { Menu, type MenuItem } from '../../components/ui/Menu';
import { TOOL_PILL_CLASSES, toolPillStyle } from '../issues/issueStyles';
import { TICKET_STATUS } from './ticketMeta';
import { useChangeTicketStatus } from './hooks';
import type { TicketDetail, TicketStatus } from '../../lib/types';

const STATUS_ORDER: TicketStatus[] = ['new', 'open', 'pending', 'on_hold', 'solved', 'closed'];

function dot(color: string): CSSProperties {
    return { width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' };
}

/** The status as the menu trigger shows it, for a viewer: no ▾, nothing to press. */
export function TicketStatusLabel({ ticket }: { ticket: TicketDetail }) {
    const current = TICKET_STATUS[ticket.status];
    return (
        <span className="border-border bg-panel text-fg2" style={{ ...toolPillStyle, padding: '6px 13px', fontSize: 12.5, cursor: 'default' }}>
            <span style={dot(current.color)} />
            {current.label}
        </span>
    );
}

export function TicketStatusMenu({ ticket }: { ticket: TicketDetail }) {
    const changeStatus = useChangeTicketStatus(ticket.id);
    const current = TICKET_STATUS[ticket.status];

    const items: MenuItem[] = STATUS_ORDER.map((s) => ({
        key: s,
        label: TICKET_STATUS[s].label,
        icon: <span style={dot(TICKET_STATUS[s].color)} />,
        onActivate: () => changeStatus.mutate(s),
    }));

    const triggerStyle: CSSProperties = { ...toolPillStyle, padding: '6px 13px', fontSize: 12.5 };

    return (
        <Menu
            placement="bottom-start"
            trigger={
                <button type="button" className={TOOL_PILL_CLASSES} style={triggerStyle} aria-label={`Status: ${current.label}`}>
                    <span style={dot(current.color)} />
                    {current.label}
                    <span aria-hidden="true" style={{ color: 'var(--fg3)' }}>▾</span>
                </button>
            }
            items={items}
        />
    );
}
