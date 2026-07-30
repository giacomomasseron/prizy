import { useState, type CSSProperties } from 'react';
import { TICKET_VIEWS, viewCount, type TicketViewKey } from './ticketViews';
import { TICKET_CHANNEL } from './ticketMeta';
import type { TicketChannel, TicketCounts, HelpdeskSavedView } from '../../lib/types';

const CHANNELS: TicketChannel[] = ['email', 'chat', 'portal', 'api'];

const rowCss = (active: boolean): CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '6px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12.8, fontWeight: active ? 600 : 500, textAlign: 'left', fontFamily: 'inherit', color: active ? 'var(--fg)' : 'var(--fg2)', background: active ? 'var(--hover)' : 'transparent' });
const sectionLabel: CSSProperties = { padding: '8px 14px 4px', fontSize: 10.5, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--fg3)' };
const badge: CSSProperties = { fontSize: 11, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' };

export function SupportViewsSidebar({ counts, view, onSelectView, channel, onSelectChannel, tag, onClearTag, savedViews, savedViewId, onSelectSavedView, onDeleteSavedView, onSaveView }: {
    counts: TicketCounts | undefined;
    view: TicketViewKey;
    onSelectView: (v: TicketViewKey) => void;
    channel: TicketChannel | null;
    onSelectChannel: (c: TicketChannel) => void;
    tag: { id: string; name: string } | null;
    onClearTag: () => void;
    savedViews: HelpdeskSavedView[];
    savedViewId: string | null;
    onSelectSavedView: (id: string) => void;
    onDeleteSavedView: (id: string) => void;
    onSaveView: (name: string) => void;
}) {
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState('');

    const submit = () => {
        const trimmed = name.trim();
        if (trimmed === '') return;
        onSaveView(trimmed);
        setName('');
        setSaving(false);
    };

    return (
        <aside style={{ width: 216, flexShrink: 0, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ padding: '15px 16px 6px', fontSize: 15, fontWeight: 600, letterSpacing: '-.01em' }}>Support</div>
            <div style={{ padding: '4px 16px 10px', fontSize: 11, color: 'var(--fg3)' }}>Agent workspace</div>

            <div style={sectionLabel}>Views</div>
            <div style={{ padding: '0 8px 10px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {TICKET_VIEWS.map((v) => {
                    const active = view === v.key && !savedViewId;
                    return (
                        <button key={v.key} type="button" onClick={() => onSelectView(v.key)} style={rowCss(active)} className={active ? '' : 'hover:bg-hover'}>
                            <span style={{ width: 15, display: 'inline-flex', justifyContent: 'center', color: 'var(--fg3)' }}>{v.icon}</span>
                            <span style={{ flex: 1 }}>{v.label}</span>
                            <span style={badge}>{counts ? viewCount(v.key, counts) : ''}</span>
                        </button>
                    );
                })}
            </div>

            <div style={sectionLabel}>Channels</div>
            <div style={{ padding: '0 8px 10px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {CHANNELS.map((c) => {
                    const active = channel === c && !savedViewId;
                    return (
                        <button key={c} type="button" aria-pressed={active} onClick={() => onSelectChannel(c)} style={rowCss(active)} className={active ? '' : 'hover:bg-hover'}>
                            <span style={{ width: 15, display: 'inline-flex', justifyContent: 'center', color: 'var(--fg3)' }}>{TICKET_CHANNEL[c].icon}</span>
                            <span style={{ flex: 1 }}>{TICKET_CHANNEL[c].label}</span>
                            <span style={badge}>{counts ? counts.by_channel[c] : ''}</span>
                        </button>
                    );
                })}
            </div>

            <div style={sectionLabel}>Saved views</div>
            <div style={{ padding: '0 8px 6px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {savedViews.map((sv) => {
                    const active = savedViewId === sv.id;
                    return (
                        <div key={sv.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }} className="group">
                            <button type="button" onClick={() => onSelectSavedView(sv.id)} style={{ ...rowCss(active), flex: 1 }} className={active ? '' : 'hover:bg-hover'}>
                                <span style={{ width: 15, display: 'inline-flex', justifyContent: 'center', color: 'var(--fg3)' }}>☰</span>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sv.name}</span>
                            </button>
                            <button type="button" aria-label={`Delete view ${sv.name}`} onClick={() => onDeleteSavedView(sv.id)} style={{ border: 'none', background: 'transparent', color: 'var(--fg3)', cursor: 'pointer', padding: '2px 6px', fontSize: 13, fontFamily: 'inherit' }}>✕</button>
                        </div>
                    );
                })}
                {saving ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '6px 9px' }}>
                        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="View name" onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setSaving(false); setName(''); } }} style={{ fontSize: 12.5, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'inherit' }} />
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" onClick={submit} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--sup)', background: 'var(--sup2)', color: 'var(--sup)', cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
                            <button type="button" onClick={() => { setSaving(false); setName(''); }} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg2)', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                        </div>
                    </div>
                ) : (
                    <button type="button" onClick={() => setSaving(true)} style={{ ...rowCss(false), color: 'var(--fg3)' }} className="hover:bg-hover">
                        <span style={{ width: 15, display: 'inline-flex', justifyContent: 'center' }}>＋</span>
                        <span style={{ flex: 1 }}>+ Save view</span>
                    </button>
                )}
            </div>

            {tag && (
                <>
                    <div style={sectionLabel}>Filter</div>
                    <div style={{ padding: '0 14px 12px' }}>
                        <button type="button" onClick={onClearTag} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, padding: '3px 9px', borderRadius: 20, background: 'var(--sup2)', border: '1px solid var(--sup)', color: 'var(--sup)', cursor: 'pointer', fontFamily: 'inherit' }}>
                            Tag: {tag.name} <span aria-hidden="true">✕</span>
                        </button>
                    </div>
                </>
            )}
        </aside>
    );
}
