import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { canDevelop as canDevelopFor } from '../../auth/capabilities';
import { useReleases } from './hooks';
import { NewReleaseModal } from './NewReleaseModal';
import type { Release } from '../../lib/types';

const panel: CSSProperties = { border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)' };
const rowLink: CSSProperties = { display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', textDecoration: 'none', color: 'inherit', borderBottom: '1px solid var(--border)' };

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function UpcomingRow({ release }: { release: Release }) {
    const { rollup } = release;
    const denom = Math.max(rollup.total - rollup.cancelled, 0);
    const pct = rollup.pct ?? 0;
    return (
        <Link to={`/releases/${release.id}`} style={rowLink} className="hover:bg-hover">
            <span style={{ flex: '1 1 auto', minWidth: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--fg)' }}>{release.name}</span>
            <span style={{ width: 96, flexShrink: 0, fontSize: 12, color: 'var(--fg3)' }}>{formatDate(release.target_date)}</span>
            <span style={{ width: 140, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg2)', overflow: 'hidden' }}>
                    <span style={{ display: 'block', width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
                </span>
                <span style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'var(--fg3)', whiteSpace: 'nowrap' }}>{rollup.done}/{denom}</span>
            </span>
            <span style={{ width: 32, flexShrink: 0, textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--fg3)' }}>{rollup.total}</span>
        </Link>
    );
}

function ShippedRow({ release }: { release: Release }) {
    return (
        <Link to={`/releases/${release.id}`} style={rowLink} className="hover:bg-hover">
            <span style={{ flex: '1 1 auto', minWidth: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--fg)' }}>{release.name}</span>
            <span style={{ width: 96, flexShrink: 0, fontSize: 12, color: 'var(--fg3)' }}>{formatDate(release.shipped_at)}</span>
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
        <div style={{ padding: '28px 32px', maxWidth: 900 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-.02em' }}>Releases</h1>
                {canDevelop && (
                    <button
                        type="button"
                        onClick={() => setShowNew(true)}
                        style={{ marginLeft: 'auto', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 13px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                        + New release
                    </button>
                )}
            </div>

            <section style={{ marginBottom: 26 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--fg3)', marginBottom: 10 }}>Upcoming</div>
                <div data-testid="releases-upcoming" style={{ ...panel, overflow: 'hidden' }}>
                    {upcoming.map((r) => <UpcomingRow key={r.id} release={r} />)}
                    {upcoming.length === 0 && (
                        <div style={{ padding: '20px 16px', fontSize: 13, color: 'var(--fg3)' }}>No upcoming releases.</div>
                    )}
                </div>
            </section>

            <section>
                <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--fg3)', marginBottom: 10 }}>Shipped</div>
                <div data-testid="releases-shipped" style={{ ...panel, overflow: 'hidden' }}>
                    {shipped.map((r) => <ShippedRow key={r.id} release={r} />)}
                    {shipped.length === 0 && (
                        <div style={{ padding: '20px 16px', fontSize: 13, color: 'var(--fg3)' }}>No shipped releases yet.</div>
                    )}
                </div>
            </section>

            <NewReleaseModal open={showNew} onClose={() => setShowNew(false)} />
        </div>
    );
}
