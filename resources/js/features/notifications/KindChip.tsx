import { notificationMeta, type NotificationCategory } from './text';

const KIND: Record<NotificationCategory, string> = { mention: 'Mention', assign: 'Assigned', comment: 'Comment', status: 'Status', other: 'Update' };
/** The chip's colour (the design colours it by kind): ink tones, readable on the panel in both themes. */
const KIND_INK: Record<NotificationCategory, string> = { mention: 'var(--accent-ink)', assign: 'var(--blue-ink)', comment: 'var(--fg2)', status: 'var(--fg2)', other: 'var(--fg2)' };

/** A notification's kind on an outlined chip, with its glyph: "@ Mention", "→ Assigned". */
export function KindChip({ type }: { type: string }) {
    const meta = notificationMeta(type);
    return (
        <span data-testid="kind-chip" style={{ fontSize: 12, fontWeight: 700, color: KIND_INK[meta.category], borderWidth: 'var(--line)', borderStyle: 'solid', borderColor: 'var(--border)', borderRadius: 'var(--radius-pill)', padding: '0 9px', whiteSpace: 'nowrap' }}>
            <span aria-hidden="true">{meta.icon} </span>{KIND[meta.category]}
        </span>
    );
}
