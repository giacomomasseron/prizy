import type { RepliesBucket } from '../../lib/types';
import { sectionTitle } from '../issues/issueStyles';
import { cardSub, deskCard } from '../support/supportStyles';

export function RepliesPerDayChart({ buckets }: { buckets: RepliesBucket[] }) {
    const max = Math.max(1, ...buckets.map((b) => b.count));
    return (
        <div style={{ ...deskCard, padding: '18px 20px' }}>
            <div style={sectionTitle(17)}>Replies per day</div>
            <div style={{ ...cardSub, marginBottom: 16 }}>Public replies + internal notes</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 120, borderBottom: '1px solid var(--border)' }}>
                {buckets.map((b, i) => (
                    <div key={i} title={`${b.label} · ${b.count} replies`} style={{ flex: 1, minWidth: 0, height: `${(b.count / max) * 100}%`, minHeight: 2, background: 'var(--sup)', opacity: 0.75, borderRadius: '6px 6px 0 0' }} />
                ))}
            </div>
            <div style={{ display: 'flex', gap: 5, marginTop: 7 }}>
                {buckets.map((b, i) => (
                    <div key={i} style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: 10.5, color: 'var(--fg3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden' }}>{b.label}</div>
                ))}
            </div>
        </div>
    );
}
