import { useState, type CSSProperties } from 'react';
import { usePostTicketMessage, useChangeTicketStatus } from './hooks';
import { nextStatus, MACROS } from './statusFlow';
import { TICKET_STATUS } from './ticketMeta';
import { ApiError } from '../../lib/apiClient';
import { Button } from '../../components/ui/Button';
import { SMALL_PILL_CLASSES, smallPill, tint } from './supportStyles';
import type { TicketDetail } from '../../lib/types';

type Tab = 'public' | 'note';

export function TicketComposer({ ticket }: { ticket: TicketDetail }) {
    const [tab, setTab] = useState<Tab>('public');
    const [draft, setDraft] = useState('');
    const [error, setError] = useState<string | null>(null);
    const post = usePostTicketMessage(ticket.id);
    const changeStatus = useChangeTicketStatus(ticket.id);

    const isNote = tab === 'note';
    const pending = post.isPending || changeStatus.isPending;
    const canSend = draft.trim().length > 0 && !pending;
    const next = nextStatus(ticket.status);
    const sendLabel = isNote ? 'Add note' : `Submit as ${TICKET_STATUS[next].label}`;

    // The mode cue: the reply box's border and the active tab's dot. The send button stays ink.
    const accent = isNote ? 'var(--note)' : 'var(--sup)';

    function addMacro(text: string) {
        setDraft((d) => (d ? `${d}\n\n${text}` : text));
    }

    async function submit() {
        const body = draft.trim();
        if (!body || pending) return;
        setError(null);
        try {
            await post.mutateAsync({ body, internal: isNote });
            if (!isNote) changeStatus.mutate(next);
            // Only clear the draft if it still holds what we just submitted — the request may
            // resolve after the user has already switched tabs and started a new message.
            setDraft((d) => (d.trim() === body ? '' : d));
        } catch (e) {
            setError(e instanceof ApiError ? e.detail : 'Something went wrong. Please try again.');
        }
    }

    const tabStyle = (active: boolean): CSSProperties => ({
        display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 'var(--radius-pill)', border: 'none',
        fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
        color: active ? 'var(--fg)' : 'var(--fg2)', background: active ? 'var(--panel)' : 'transparent',
        boxShadow: active ? '0 0 0 1.5px var(--border)' : 'none',
    });
    const dot = (color: string): CSSProperties => ({ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 });

    return (
        <div style={{ flexShrink: 0, borderTop: `1px solid var(--border)`, background: 'var(--panel)', padding: '12px 20px' }}>
            <div style={{ maxWidth: 760, margin: '0 auto' }}>
                <div style={{ display: 'inline-flex', gap: 2, padding: 3, background: 'var(--bg2)', border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-pill)', marginBottom: 10 }}>
                    <button type="button" aria-pressed={!isNote} style={tabStyle(!isNote)} onClick={() => { setTab('public'); setError(null); }}>
                        <span aria-hidden="true" style={dot('var(--sup)')} />Public reply
                    </button>
                    <button type="button" aria-pressed={isNote} style={tabStyle(isNote)} onClick={() => { setTab('note'); setError(null); }}>
                        <span aria-hidden="true" style={dot('var(--note)')} />Internal note
                    </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {MACROS.map((m) => (
                        <button key={m.label} type="button" onClick={() => addMacro(m.text)} className={SMALL_PILL_CLASSES} style={smallPill}>
                            {m.label}
                        </button>
                    ))}
                </div>

                {error && (
                    <div role="alert" style={{ marginBottom: 8, padding: '9px 12px', borderRadius: 'var(--radius-row)', border: 'var(--line) solid ' + tint('var(--red)', 45), background: tint('var(--red)', 10), color: 'var(--red)', fontSize: 12.5 }}>
                        {error}
                    </div>
                )}

                <div data-testid="composer-box" style={{ border: `var(--line) solid ${accent}`, borderRadius: 'var(--radius-card)', background: isNote ? 'var(--note2)' : 'var(--panel)', overflow: 'hidden' }}>
                    <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder={isNote ? 'Write an internal note…' : 'Write a reply…'}
                        aria-label={isNote ? 'Internal note' : 'Public reply'}
                        rows={3}
                        style={{ width: '100%', resize: 'vertical', border: 'none', outline: 'none', background: 'transparent', color: 'var(--fg)', fontSize: 13.5, lineHeight: 1.6, padding: '12px 15px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
                        <span aria-hidden="true" style={{ display: 'flex', gap: 10, color: 'var(--fg3)', fontSize: 14 }}>
                            <span>📎</span><span style={{ fontWeight: 700 }}>B</span><span style={{ fontStyle: 'italic' }}>I</span><span style={{ fontFamily: 'var(--font-mono)' }}>{'</>'}</span>
                        </span>
                        <Button size="sm" onClick={submit} disabled={!canSend} style={{ marginLeft: 'auto' }}>
                            {sendLabel}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
