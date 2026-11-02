import { useState, type CSSProperties } from 'react';

export const REACTION_EMOJIS = ['👀', '🎯', '🙏', '💯', '✅'];

// Border width/style inline; colours are classes so the hover border works.
const PILL: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
    borderRadius: 'var(--radius-pill)', borderWidth: 'var(--line)', borderStyle: 'solid',
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
};
const pillClasses = (reacted: boolean) =>
    reacted ? 'border-fg bg-hi text-on-hi' : 'border-border bg-bg2 text-fg2 hover:border-fg';

export function CommentReactions({ reactions, onToggle }: {
    reactions: { emoji: string; count: number; reacted: boolean }[];
    onToggle: (emoji: string) => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {reactions.map((r) => (
                <button key={r.emoji} type="button" onClick={() => onToggle(r.emoji)} className={pillClasses(r.reacted)} style={PILL}>
                    {r.emoji} {r.count}
                </button>
            ))}
            <button type="button" aria-label="Add reaction" onClick={() => setOpen((o) => !o)}
                className={pillClasses(false)} style={{ ...PILL, padding: '3px 9px' }}>＋</button>
            {open && (
                <span style={{ display: 'inline-flex', gap: 4 }}>
                    {REACTION_EMOJIS.map((e) => (
                        <button key={e} type="button" aria-label={e} onClick={() => { onToggle(e); setOpen(false); }}
                            className={pillClasses(false)} style={{ ...PILL, padding: '3px 9px' }}>{e}</button>
                    ))}
                </span>
            )}
        </div>
    );
}
