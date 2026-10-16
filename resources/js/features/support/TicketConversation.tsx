import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useTicket } from './hooks';
import { QueryState } from '../../components/ui/QueryState';
import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';
import { TICKET_CHANNEL } from './ticketMeta';
import type { TicketDetail, TicketMessage } from '../../lib/types';
import { TicketComposer } from './TicketComposer';
import { TicketStatusLabel, TicketStatusMenu } from './TicketStatusMenu';
import { useMe } from '../../auth/useAuth';
import { canWriteHelpdesk } from '../../auth/capabilities';
import { paneHeader, paneTitle, tint } from './supportStyles';
import { ink } from '../../lib/ink';
import { issueRef } from '../issues/issueMeta';

const mainStyle: CSSProperties = { flex: 1, minWidth: 460, display: 'flex', flexDirection: 'column', background: 'var(--bg)' };
function Empty({ text }: { text: string }) { return <div style={{ margin: 'auto', color: 'var(--fg3)', fontSize: 13 }}>{text}</div>; }

function MessageRow({ m }: { m: TicketMessage }) {
    const isAgent = m.kind === 'agent';
    const isNote = m.kind === 'note';
    const border = isNote ? tint('var(--note)', 40) : 'var(--border)';
    const bg = isNote ? 'var(--note2)' : 'var(--panel)';
    const roleLabel = isNote ? 'Internal note' : (isAgent ? 'Agent' : 'Customer');
    const tagColor = isNote ? 'var(--note)' : (isAgent ? 'var(--sup)' : 'var(--fg2)');
    const tagBg = isNote ? 'var(--note2)' : (isAgent ? 'var(--sup2)' : 'var(--hover)');
    return (
        <div data-testid="ticket-message" data-kind={m.kind} style={{ display: 'flex', gap: 12, flexDirection: isAgent ? 'row-reverse' : 'row' }}>
            <Avatar {...avatarFor({ id: m.id, name: m.sender.name ?? '?' })} size={32} />
            <div style={{ flex: 1, minWidth: 0, border: `var(--line) solid ${border}`, background: bg, borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 15px', borderBottom: `1px solid ${border}` }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{m.sender.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 'var(--radius-pill)', color: ink(tagColor), background: tagBg }}>{roleLabel}</span>
                </div>
                <div style={{ padding: '12px 15px', fontSize: 13.5, color: 'var(--fg)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.body}</div>
            </div>
        </div>
    );
}

export function TicketConversation({ ticketId }: { ticketId: string | undefined }) {
    const q = useTicket(ticketId ?? '');
    if (!ticketId) return <div style={mainStyle}><Empty text="Select a ticket" /></div>;
    return (
        <div style={mainStyle}>
            <QueryState query={q} what="this ticket" frame={{ margin: 'auto', padding: 16 }}>
                {q.data && <TicketBody t={q.data} />}
            </QueryState>
        </div>
    );
}

function TicketBody({ t }: { t: TicketDetail }) {
    const linked = t.linked_issues[0];
    const canWrite = canWriteHelpdesk(useMe().data); // a viewer reads the thread: no status menu, no composer
    return (
        <>
            <header style={paneHeader}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={paneTitle}>{t.subject}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 2, fontSize: 12, color: 'var(--fg3)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>#{t.id.slice(0, 8)}</span><span>·</span><span>{TICKET_CHANNEL[t.channel].label}</span>
                    </div>
                </div>
                {t.csat_rating && (
                    <span title="Customer satisfaction rating" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 'var(--radius-pill)', border: 'var(--line) solid var(--border)', background: 'var(--bg2)', fontSize: 12, fontWeight: 700, color: 'var(--fg2)', whiteSpace: 'nowrap' }}>
                        {t.csat_rating === 'thumbs_up' ? '👍 Rated good' : '👎 Rated poor'}
                    </span>
                )}
                {linked && <Link to={`/issues/${linked.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 'var(--radius-pill)', border: 'var(--line) solid var(--accent)', background: 'var(--accent2)', color: 'var(--accent-ink)', fontSize: 12.5, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>↩ {issueRef(linked)} ↗</Link>}
                {canWrite ? <TicketStatusMenu ticket={t} /> : <TicketStatusLabel ticket={t} />}
            </header>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '22px 20px 20px' }}>
                <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {t.messages.map((m) => <MessageRow key={m.id} m={m} />)}
                </div>
            </div>
            {canWrite && <TicketComposer ticket={t} />}
        </>
    );
}
