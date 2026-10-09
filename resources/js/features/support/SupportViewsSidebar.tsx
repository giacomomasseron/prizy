import { useState, type CSSProperties } from 'react';
import { TICKET_VIEWS, viewCount, type TicketViewKey } from './ticketViews';
import { TICKET_CHANNEL } from './ticketMeta';
import { sideFrame, sideRow, sideSection, sideSub, sideTitle, smallPill } from './supportStyles';
import { NAV_ROW_HOVER, countStyle } from '../../components/sidebarStyles';
import { DELETE_X_CLASSES, deleteXStyle } from '../projects/projectStyles';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import type { TicketChannel, TicketCounts, HelpdeskSavedView } from '../../lib/types';

const CHANNELS: TicketChannel[] = ['email', 'chat', 'portal', 'api'];

const icon: CSSProperties = { width: 16, display: 'inline-flex', justifyContent: 'center', color: 'var(--fg3)' };
const rowList: CSSProperties = { padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 1 };

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
        <aside style={sideFrame}>
            <div style={sideTitle}>Support</div>
            <div style={sideSub}>Agent workspace</div>

            <div style={sideSection}>Views</div>
            <div style={rowList}>
                {TICKET_VIEWS.map((v) => {
                    const active = view === v.key && !savedViewId;
                    return (
                        <button key={v.key} type="button" onClick={() => onSelectView(v.key)} style={sideRow(active)} className={active ? '' : NAV_ROW_HOVER}>
                            <span style={icon}>{v.icon}</span>
                            <span style={{ flex: 1 }}>{v.label}</span>
                            <span style={countStyle}>{counts ? viewCount(v.key, counts) : ''}</span>
                        </button>
                    );
                })}
            </div>

            <div style={sideSection}>Channels</div>
            <div style={rowList}>
                {CHANNELS.map((c) => {
                    const active = channel === c && !savedViewId;
                    return (
                        <button key={c} type="button" aria-pressed={active} onClick={() => onSelectChannel(c)} style={sideRow(active)} className={active ? '' : NAV_ROW_HOVER}>
                            <span style={icon}>{TICKET_CHANNEL[c].icon}</span>
                            <span style={{ flex: 1 }}>{TICKET_CHANNEL[c].label}</span>
                            <span style={countStyle}>{counts ? counts.by_channel[c] : ''}</span>
                        </button>
                    );
                })}
            </div>

            <div style={sideSection}>Saved views</div>
            <div style={rowList}>
                {savedViews.map((sv) => {
                    const active = savedViewId === sv.id;
                    return (
                        <div key={sv.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }} className="group">
                            <button type="button" onClick={() => onSelectSavedView(sv.id)} style={{ ...sideRow(active), flex: 1, minWidth: 0 }} className={active ? '' : NAV_ROW_HOVER}>
                                <span style={icon}>☰</span>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sv.name}</span>
                            </button>
                            <button type="button" aria-label={`Delete view ${sv.name}`} onClick={() => onDeleteSavedView(sv.id)} className={DELETE_X_CLASSES} style={{ ...deleteXStyle, fontSize: 13 }}>✕</button>
                        </div>
                    );
                })}
                {saving ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '6px 4px' }}>
                        <Input autoFocus aria-label="View name" value={name} onChange={(e) => setName(e.target.value)} placeholder="View name" onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setSaving(false); setName(''); } }} style={{ padding: '6px 12px', fontSize: 13 }} />
                        <div style={{ display: 'flex', gap: 6 }}>
                            <Button size="sm" onClick={submit}>Save</Button>
                            <Button variant="secondary" size="sm" onClick={() => { setSaving(false); setName(''); }}>Cancel</Button>
                        </div>
                    </div>
                ) : (
                    <button type="button" onClick={() => setSaving(true)} style={{ ...sideRow(false), color: 'var(--fg3)' }} className={NAV_ROW_HOVER}>
                        <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}>＋</span>
                        <span style={{ flex: 1 }}>+ Save view</span>
                    </button>
                )}
            </div>

            {tag && (
                <>
                    <div style={sideSection}>Filter</div>
                    <div style={{ padding: '0 16px 12px' }}>
                        {/* Green border = an active filter; the label stays ink (no small green text). */}
                        <button type="button" onClick={onClearTag} title={`Tag: ${tag.name}`} className="border-sup bg-transparent text-fg hover:bg-sup2" style={{ ...smallPill, maxWidth: '100%' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Tag: {tag.name}</span><span aria-hidden="true">✕</span>
                        </button>
                    </div>
                </>
            )}
        </aside>
    );
}
