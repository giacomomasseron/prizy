import type { CSSProperties } from 'react';
import { TICKET_VIEWS, filterByView, type TicketViewKey } from './ticketViews';
import type { TicketListItem } from '../../lib/types';

const rowCss = (active: boolean): CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '6px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12.8, fontWeight: active ? 600 : 500, textAlign: 'left', fontFamily: 'inherit', color: active ? 'var(--fg)' : 'var(--fg2)', background: active ? 'var(--hover)' : 'transparent' });

export function SupportViewsSidebar({ tickets, view, meId, onSelectView }: { tickets: TicketListItem[]; view: TicketViewKey; meId: string | undefined; onSelectView: (v: TicketViewKey) => void }) {
    return (
        <aside style={{ width: 216, flexShrink: 0, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ padding: '15px 16px 6px', fontSize: 15, fontWeight: 600, letterSpacing: '-.01em' }}>Support</div>
            <div style={{ padding: '4px 16px 10px', fontSize: 11, color: 'var(--fg3)' }}>Agent workspace</div>
            <div style={{ padding: '8px 14px 4px', fontSize: 10.5, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--fg3)' }}>Views</div>
            <div style={{ padding: '0 8px 10px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {TICKET_VIEWS.map((v) => (
                    <button key={v.key} type="button" onClick={() => onSelectView(v.key)} style={rowCss(view === v.key)} className={view === v.key ? '' : 'hover:bg-hover'}>
                        <span style={{ width: 15, display: 'inline-flex', justifyContent: 'center', color: 'var(--fg3)' }}>{v.icon}</span>
                        <span style={{ flex: 1 }}>{v.label}</span>
                        <span style={{ fontSize: 11, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>{filterByView(tickets, v.key, meId).length}</span>
                    </button>
                ))}
            </div>
        </aside>
    );
}
