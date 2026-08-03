import { useState, type CSSProperties } from 'react';

export const REACTION_EMOJIS = ['👀', '🎯', '🙏', '💯', '✅'];

const pill = (active: boolean): CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 20,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border2)'}`, background: 'var(--bg2)',
    fontSize: 11.5, color: 'var(--fg2)', cursor: 'pointer', fontFamily: 'inherit',
});

export function CommentReactions({ reactions, onToggle }: {
    reactions: { emoji: string; count: number; reacted: boolean }[];
    onToggle: (emoji: string) => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {reactions.map((r) => (
                <button key={r.emoji} type="button" onClick={() => onToggle(r.emoji)} style={pill(r.reacted)}>
                    {r.emoji} {r.count}
                </button>
            ))}
            <button type="button" aria-label="Add reaction" onClick={() => setOpen((o) => !o)}
                style={{ ...pill(false), color: 'var(--fg3)', padding: '2px 7px' }}>＋</button>
            {open && (
                <span style={{ display: 'inline-flex', gap: 4 }}>
                    {REACTION_EMOJIS.map((e) => (
                        <button key={e} type="button" aria-label={e} onClick={() => { onToggle(e); setOpen(false); }}
                            style={{ ...pill(false), padding: '2px 7px' }}>{e}</button>
                    ))}
                </span>
            )}
        </div>
    );
}
