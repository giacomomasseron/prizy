import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useTicket } from './hooks';
import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';
import { TICKET_CHANNEL } from './ticketMeta';
import type { TicketMessage } from '../../lib/types';
import { TicketComposer } from './TicketComposer';
import { TicketStatusMenu } from './TicketStatusMenu';

const mainStyle: CSSProperties = { flex: 1, minWidth: 460, display: 'flex', flexDirection: 'column', background: 'var(--bg)' };
function Empty({ text }: { text: string }) { return <div style={{ margin: 'auto', color: 'var(--fg3)', fontSize: 13 }}>{text}</div>; }

function MessageRow({ m }: { m: TicketMessage }) {
    const isAgent = m.kind === 'agent';
    const isNote = m.kind === 'note';
    const border = isNote ? 'rgba(224,161,58,.35)' : 'var(--border)';
    const bg = isNote ? 'var(--note2)' : 'var(--panel)';
    const roleLabel = isNote ? 'Internal note' : (isAgent ? 'Agent' : 'Customer');
    const tagColor = isNote ? 'var(--note)' : (isAgent ? 'var(--sup)' : 'var(--fg2)');
    const tagBg = isNote ? 'var(--note2)' : (isAgent ? 'var(--sup2)' : 'var(--hover)');
    return (
        <div data-testid="ticket-message" data-kind={m.kind} style={{ display: 'flex', gap: 12, flexDirection: isAgent ? 'row-reverse' : 'row' }}>
            <Avatar {...avatarFor({ id: m.id, name: m.sender.name ?? '?' })} size={32} />
            <div style={{ flex: 1, minWidth: 0, border: `1px solid ${border}`, background: bg, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderBottom: `1px solid ${border}` }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{m.sender.name}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 600, padding: '1px 7px', borderRadius: 5, color: tagColor, background: tagBg }}>{roleLabel}</span>
                </div>
                <div style={{ padding: '12px 14px', fontSize: 13.2, color: 'var(--fg)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.body}</div>
            </div>
        </div>
    );
}

export function TicketConversation({ ticketId }: { ticketId: string | undefined }) {
    const q = useTicket(ticketId ?? '');
    const t = q.data;
    if (!ticketId) return <main style={mainStyle}><Empty text="Select a ticket" /></main>;
    if (q.isLoading || !t) return <main style={mainStyle}><Empty text="Loading…" /></main>;
    const linked = t.linked_issues[0];
    return (
        <main style={mainStyle}>
            <header style={{ minHeight: 52, flexShrink: 0, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.subject}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 2, fontSize: 11.5, color: 'var(--fg3)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>#{t.id.slice(0, 8)}</span><span>·</span><span>{TICKET_CHANNEL[t.channel].label}</span>
                    </div>
                </div>
                {t.csat_rating && (
                    <span title="Customer satisfaction rating" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg2)', fontSize: 11.5, fontWeight: 600, color: 'var(--fg2)', whiteSpace: 'nowrap' }}>
                        {t.csat_rating === 'thumbs_up' ? '👍 Rated good' : '👎 Rated poor'}
                    </span>
                )}
                {linked && <Link to={`/issues/${linked.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 8, border: '1px solid var(--accent)', background: 'var(--accent2)', color: 'var(--accent)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>↩ {linked.identifier ?? linked.id.slice(0, 6)} ↗</Link>}
                <TicketStatusMenu ticket={t} />
            </header>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '22px 20px 20px' }}>
                <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {t.messages.map((m) => <MessageRow key={m.id} m={m} />)}
                </div>
            </div>
            <TicketComposer ticket={t} />
        </main>
    );
}
