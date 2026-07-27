import type { CSSProperties } from 'react';
import { TICKET_VIEWS, viewCount, type TicketViewKey } from './ticketViews';
import { TICKET_CHANNEL } from './ticketMeta';
import type { TicketChannel, TicketCounts } from '../../lib/types';

const CHANNELS: TicketChannel[] = ['email', 'chat', 'portal', 'api'];

const rowCss = (active: boolean): CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '6px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12.8, fontWeight: active ? 600 : 500, textAlign: 'left', fontFamily: 'inherit', color: active ? 'var(--fg)' : 'var(--fg2)', background: active ? 'var(--hover)' : 'transparent' });
const sectionLabel: CSSProperties = { padding: '8px 14px 4px', fontSize: 10.5, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--fg3)' };
const badge: CSSProperties = { fontSize: 11, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' };

export function SupportViewsSidebar({ counts, view, onSelectView, channel, onSelectChannel }: {
    counts: TicketCounts | undefined;
    view: TicketViewKey;
    onSelectView: (v: TicketViewKey) => void;
    channel: TicketChannel | null;
    onSelectChannel: (c: TicketChannel) => void;
}) {
    return (
        <aside style={{ width: 216, flexShrink: 0, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ padding: '15px 16px 6px', fontSize: 15, fontWeight: 600, letterSpacing: '-.01em' }}>Support</div>
            <div style={{ padding: '4px 16px 10px', fontSize: 11, color: 'var(--fg3)' }}>Agent workspace</div>

            <div style={sectionLabel}>Views</div>
            <div style={{ padding: '0 8px 10px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {TICKET_VIEWS.map((v) => (
                    <button key={v.key} type="button" onClick={() => onSelectView(v.key)} style={rowCss(view === v.key)} className={view === v.key ? '' : 'hover:bg-hover'}>
                        <span style={{ width: 15, display: 'inline-flex', justifyContent: 'center', color: 'var(--fg3)' }}>{v.icon}</span>
                        <span style={{ flex: 1 }}>{v.label}</span>
                        <span style={badge}>{counts ? viewCount(v.key, counts) : ''}</span>
                    </button>
                ))}
            </div>

            <div style={sectionLabel}>Channels</div>
            <div style={{ padding: '0 8px 10px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {CHANNELS.map((c) => (
                    <button key={c} type="button" aria-pressed={channel === c} onClick={() => onSelectChannel(c)} style={rowCss(channel === c)} className={channel === c ? '' : 'hover:bg-hover'}>
                        <span style={{ width: 15, display: 'inline-flex', justifyContent: 'center', color: 'var(--fg3)' }}>{TICKET_CHANNEL[c].icon}</span>
                        <span style={{ flex: 1 }}>{TICKET_CHANNEL[c].label}</span>
                        <span style={badge}>{counts ? counts.by_channel[c] : ''}</span>
                    </button>
                ))}
            </div>
        </aside>
    );
}
