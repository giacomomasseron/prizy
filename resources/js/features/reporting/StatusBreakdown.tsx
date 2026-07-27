import { TICKET_STATUS } from '../support/ticketMeta';
import type { TicketStatus } from '../../lib/types';

const ORDER: TicketStatus[] = ['new', 'open', 'pending', 'on_hold', 'solved', 'closed'];

export function StatusBreakdown({ byStatus }: { byStatus: Record<TicketStatus, number> }) {
    const max = Math.max(1, ...ORDER.map((s) => byStatus[s]));
    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', padding: '16px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>Tickets by status</div>
            <div style={{ fontSize: 11, color: 'var(--fg3)', marginBottom: 14 }}>Current queue snapshot</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ORDER.map((s) => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <span style={{ width: 66, fontSize: 12, color: 'var(--fg2)', flexShrink: 0 }}>{TICKET_STATUS[s].label}</span>
                        <div style={{ flex: 1, height: 8, borderRadius: 5, background: 'var(--border)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(byStatus[s] / max) * 100}%`, background: TICKET_STATUS[s].color, borderRadius: 5 }} />
                        </div>
                        <span style={{ width: 24, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, flexShrink: 0 }}>{byStatus[s]}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
