import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { canDevelop as canDevelopFor } from '../../auth/capabilities';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { sectionLabel } from '../../components/sidebarStyles';
import { useReleases } from './hooks';
import { NewReleaseModal } from './NewReleaseModal';
import { formatTargetDate } from './formatDate';
import type { Release } from '../../lib/types';

const card: CSSProperties = { border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-card)', background: 'var(--panel)', overflow: 'hidden' };
const rowLink: CSSProperties = { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', textDecoration: 'none', color: 'inherit' };
// Separator + hover are classes (an inline background would beat hover:).
const ROW_CLASSES = 'border-b border-border last:border-b-0 hover:bg-hover';
const emptyRow: CSSProperties = { padding: '22px 18px', fontSize: 13.5, color: 'var(--fg3)' };

// `shipped_at` is a real timestamp (not a date-only string), so instant→local
// conversion via `new Date(iso)` is correct here — unlike `target_date`, which
// uses the timezone-safe `formatTargetDate` (see formatDate.ts).
function formatShippedAt(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function UpcomingRow({ release }: { release: Release }) {
    const { rollup } = release;
    const denom = Math.max(rollup.total - rollup.cancelled, 0);
    const pct = rollup.pct ?? 0;
    return (
        <Link to={`/releases/${release.id}`} style={rowLink} className={ROW_CLASSES}>
            <span style={{ flex: '1 1 auto', minWidth: 0, fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>{release.name}</span>
            <span style={{ width: 110, flexShrink: 0, fontSize: 12.5, color: 'var(--fg3)' }}>{formatTargetDate(release.target_date)}</span>
            <span style={{ width: 150, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1, height: 8, borderRadius: 'var(--radius-pill)', background: 'var(--bg2)', overflow: 'hidden' }}>
                    <span style={{ display: 'block', width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 'var(--radius-pill)' }} />
                </span>
                <span style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'var(--fg3)', whiteSpace: 'nowrap' }}>{rollup.done}/{denom}</span>
            </span>
            <span style={{ width: 32, flexShrink: 0, textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--fg3)' }}>{rollup.total}</span>
        </Link>
    );
}

function ShippedRow({ release }: { release: Release }) {
    return (
        <Link to={`/releases/${release.id}`} style={rowLink} className={ROW_CLASSES}>
            <span style={{ flex: '1 1 auto', minWidth: 0, fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>{release.name}</span>
            <span style={{ width: 110, flexShrink: 0, fontSize: 12.5, color: 'var(--fg3)' }}>{formatShippedAt(release.shipped_at)}</span>
            <span style={{ width: 32, flexShrink: 0, textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--fg3)' }}>{release.rollup.total}</span>
        </Link>
    );
}

export default function ReleasesPage() {
    const me = useMe();
    const canDevelop = canDevelopFor(me.data);
    const releasesQ = useReleases();
    const [showNew, setShowNew] = useState(false);

    const releases = releasesQ.data ?? [];
    const upcoming = releases.filter((r) => r.shipped_at === null);
    const shipped = releases.filter((r) => r.shipped_at !== null);

    return (
        <>
            <PageHeader
                title="Releases"
                actions={canDevelop ? <Button onClick={() => setShowNew(true)}>+ New release</Button> : undefined}
            />

            <div style={{ padding: '4px 26px 40px', maxWidth: 952, boxSizing: 'border-box' }}>
                <section style={{ marginBottom: 26 }}>
                    <div style={{ ...sectionLabel, marginBottom: 10 }}>Upcoming</div>
                    <div data-testid="releases-upcoming" style={card}>
                        {upcoming.map((r) => <UpcomingRow key={r.id} release={r} />)}
                        {upcoming.length === 0 && <div style={emptyRow}>No upcoming releases.</div>}
                    </div>
                </section>

                <section>
                    <div style={{ ...sectionLabel, marginBottom: 10 }}>Shipped</div>
                    <div data-testid="releases-shipped" style={card}>
                        {shipped.map((r) => <ShippedRow key={r.id} release={r} />)}
                        {shipped.length === 0 && <div style={emptyRow}>No shipped releases yet.</div>}
                    </div>
                </section>
            </div>

            <NewReleaseModal open={showNew} onClose={() => setShowNew(false)} />
        </>
    );
}
