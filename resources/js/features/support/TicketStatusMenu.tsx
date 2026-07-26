import type { CSSProperties } from 'react';
import { Menu, type MenuItem } from '../../components/ui/Menu';
import { TICKET_STATUS } from './ticketMeta';
import { useChangeTicketStatus } from './hooks';
import type { TicketDetail, TicketStatus } from '../../lib/types';

const STATUS_ORDER: TicketStatus[] = ['new', 'open', 'pending', 'on_hold', 'solved', 'closed'];

function dot(color: string): CSSProperties {
    return { width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' };
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

    const triggerStyle: CSSProperties = {
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
        border: '1px solid var(--border2)', background: 'var(--panel)', color: 'var(--fg)',
        fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
    };

    return (
        <Menu
            placement="bottom-start"
            trigger={
                <button type="button" style={triggerStyle} aria-label={`Status: ${current.label}`}>
                    <span style={dot(current.color)} />
                    {current.label}
                    <span aria-hidden="true" style={{ color: 'var(--fg3)' }}>▾</span>
                </button>
            }
            items={items}
        />
    );
}
