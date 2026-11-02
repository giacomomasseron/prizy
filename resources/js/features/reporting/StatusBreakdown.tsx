import { TICKET_STATUS } from '../support/ticketMeta';
import type { TicketStatus } from '../../lib/types';
import { sectionTitle } from '../issues/issueStyles';
import { bar, cardSub, deskCard } from '../support/supportStyles';

const ORDER: TicketStatus[] = ['new', 'open', 'pending', 'on_hold', 'solved', 'closed'];

export function StatusBreakdown({ byStatus }: { byStatus: Record<TicketStatus, number> }) {
    const max = Math.max(1, ...ORDER.map((s) => byStatus[s]));
    return (
        <div style={{ ...deskCard, padding: '18px 20px' }}>
            <div style={sectionTitle(17)}>Tickets by status</div>
            <div style={{ ...cardSub, marginBottom: 14 }}>Current queue snapshot</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ORDER.map((s) => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <span style={{ width: 66, fontSize: 12.5, color: 'var(--fg2)', flexShrink: 0 }}>{TICKET_STATUS[s].label}</span>
                        <div style={{ ...bar, flex: 1 }}>
                            <div style={{ height: '100%', width: `${(byStatus[s] / max) * 100}%`, background: TICKET_STATUS[s].color, borderRadius: 'var(--radius-pill)' }} />
                        </div>
                        <span style={{ width: 24, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, flexShrink: 0 }}>{byStatus[s]}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
