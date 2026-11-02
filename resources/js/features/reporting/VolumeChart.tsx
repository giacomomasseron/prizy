import type { VolumeBucket } from '../../lib/types';
import { sectionTitle } from '../issues/issueStyles';
import { cardSub, deskCard } from '../support/supportStyles';

export function VolumeChart({ buckets }: { buckets: VolumeBucket[] }) {
    const max = Math.max(1, ...buckets.map((b) => Math.max(b.created, b.solved)));
    return (
        <div style={{ ...deskCard, padding: '18px 20px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                    <div style={sectionTitle(17)}>Ticket volume</div>
                    <div style={cardSub}>Created vs. solved</div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg2)' }}><span style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--blue)' }} />Created</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg2)' }}><span style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--sup)' }} />Solved</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 186, borderBottom: '1px solid var(--border)' }}>
                {buckets.map((b, i) => (
                    <div key={i} title={`${b.label} · ${b.created} created, ${b.solved} solved`} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2, height: '100%' }}>
                        <div style={{ width: '100%', height: `${(b.created / max) * 100}%`, minHeight: 2, background: 'var(--blue)', borderRadius: '6px 6px 0 0' }} />
                        <div style={{ width: '100%', height: `${(b.solved / max) * 100}%`, minHeight: 2, background: 'var(--sup)', borderRadius: '6px 6px 0 0' }} />
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
                {buckets.map((b, i) => (
                    <div key={i} style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: 10.5, color: 'var(--fg3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden' }}>{b.label}</div>
                ))}
            </div>
        </div>
    );
}
