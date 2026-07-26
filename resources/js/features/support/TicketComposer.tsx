import { useState, type CSSProperties } from 'react';
import { usePostTicketMessage, useChangeTicketStatus } from './hooks';
import { nextStatus, MACROS } from './statusFlow';
import { TICKET_STATUS } from './ticketMeta';
import { ApiError } from '../../lib/apiClient';
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

    const accent = isNote ? 'var(--note)' : 'var(--sup)';
    const accentBg = isNote ? 'var(--note2)' : 'var(--sup2)';

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

    const tabStyle = (active: boolean, color: string): CSSProperties => ({
        padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
        background: active ? accentBg : 'transparent',
        color: active ? color : 'var(--fg2)',
        fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    });

    return (
        <div style={{ flexShrink: 0, borderTop: `1px solid var(--border)`, background: 'var(--panel)', padding: '12px 20px' }}>
            <div style={{ maxWidth: 760, margin: '0 auto' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <button type="button" style={tabStyle(!isNote, 'var(--sup)')} onClick={() => setTab('public')}>Public reply</button>
                    <button type="button" style={tabStyle(isNote, 'var(--note)')} onClick={() => setTab('note')}>Internal note</button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {MACROS.map((m) => (
                        <button
                            key={m.label}
                            type="button"
                            onClick={() => addMacro(m.text)}
                            style={{ padding: '4px 10px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg2)', fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>

                {error && (
                    <div role="alert" style={{ marginBottom: 8, padding: '8px 11px', borderRadius: 8, border: '1px solid var(--red)', background: 'var(--red2, rgba(220,60,60,.12))', color: 'var(--red)', fontSize: 12.5 }}>
                        {error}
                    </div>
                )}

                <div style={{ border: `1px solid ${accent}`, borderRadius: 12, background: isNote ? 'var(--note2)' : 'var(--bg)', overflow: 'hidden' }}>
                    <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder={isNote ? 'Write an internal note…' : 'Write a reply…'}
                        rows={3}
                        style={{ width: '100%', resize: 'vertical', border: 'none', outline: 'none', background: 'transparent', color: 'var(--fg)', fontSize: 13.2, lineHeight: 1.6, padding: '12px 14px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
                        <span aria-hidden="true" style={{ display: 'flex', gap: 10, color: 'var(--fg3)', fontSize: 14 }}>
                            <span>📎</span><span style={{ fontWeight: 700 }}>B</span><span style={{ fontStyle: 'italic' }}>I</span><span style={{ fontFamily: 'var(--font-mono)' }}>{'</>'}</span>
                        </span>
                        <button
                            type="button"
                            onClick={submit}
                            disabled={!canSend}
                            style={{ marginLeft: 'auto', padding: '7px 16px', borderRadius: 8, border: 'none', background: canSend ? accent : 'var(--border2)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: canSend ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
                        >
                            {sendLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
