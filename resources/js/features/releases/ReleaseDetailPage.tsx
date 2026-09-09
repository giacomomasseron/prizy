import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { canDevelop as canDevelopFor } from '../../auth/capabilities';
import { useDeleteRelease, useRelease, useShipRelease, useUpdateRelease } from './hooks';
import { buildChangelog } from './changelog';
import { formatTargetDate } from './formatDate';
import { STATUS_LABELS } from '../issues/StatusEditor';
import type { IssueStatus } from '../../lib/types';

// Mirrors the per-status colors used by StatusIcon (components/ui/StatusIcon.tsx)
// so the rollup bar and issue-row status pills read consistently with the rest
// of the tracker.
const STATUS_COLOR: Record<IssueStatus, string> = {
    backlog: 'var(--fg3)',
    todo: 'var(--fg3)',
    in_progress: 'var(--amber)',
    in_review: 'var(--blue)',
    done: 'var(--accent)',
    cancelled: 'var(--fg2)',
};

const STATUS_ORDER: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];

const sectionHeader: CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--fg3)', marginBottom: 10 };
const actionBtn: CSSProperties = { border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--fg)', borderRadius: 8, padding: '7px 13px', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' };

// `shipped_at` is a real timestamp (not a date-only string), so instant→local
// conversion via `new Date(iso)` is correct here — unlike `target_date`, which
// uses the timezone-safe `formatTargetDate` (see formatDate.ts).
function formatShippedAt(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ReleaseDetailPage() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const me = useMe();
    const canDevelop = canDevelopFor(me.data);
    const releaseQ = useRelease(id);
    const ship = useShipRelease(id);
    const del = useDeleteRelease();
    const update = useUpdateRelease(id);
    const [copied, setCopied] = useState(false);
    const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [editingName, setEditingName] = useState(false);
    const [nameDraft, setNameDraft] = useState('');
    const nameCancelledRef = useRef(false);

    const [editingDescription, setEditingDescription] = useState(false);
    const [descDraft, setDescDraft] = useState('');

    useEffect(() => () => { if (copiedTimer.current) clearTimeout(copiedTimer.current); }, []);

    if (releaseQ.isLoading) {
        return <p style={{ padding: 24, color: 'var(--fg3)' }}>Loading…</p>;
    }
    if (releaseQ.isError || !releaseQ.data) {
        return <p style={{ padding: 24, color: 'var(--fg3)' }}>Release not found.</p>;
    }

    const release = releaseQ.data;
    const isShipped = release.shipped_at !== null;
    const countByStatus = Object.fromEntries(release.by_status.map((s) => [s.key, s.count])) as Record<string, number>;
    const total = release.by_status.reduce((sum, s) => sum + s.count, 0);

    async function copyChangelog() {
        try {
            await navigator.clipboard.writeText(buildChangelog(release.name, release.issues));
            setCopied(true);
            if (copiedTimer.current) clearTimeout(copiedTimer.current);
            copiedTimer.current = setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard API unavailable (e.g. a non-secure context) — fail silently,
            // leave the button text unchanged rather than crashing the page.
        }
    }

    function handleDelete() {
        if (!window.confirm(`Delete ${release.name}? This cannot be undone.`)) return;
        del.mutate(release.id, { onSuccess: () => navigate('/releases') });
    }

    function startEditName() {
        if (!canDevelop) return;
        nameCancelledRef.current = false;
        setNameDraft(release.name);
        setEditingName(true);
    }

    function commitName() {
        setEditingName(false);
        const trimmed = nameDraft.trim();
        if (trimmed && trimmed !== release.name) {
            update.mutate({ name: trimmed });
        }
    }

    function handleNameKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            nameCancelledRef.current = true;
            setEditingName(false);
        }
    }

    function handleNameBlur() {
        if (nameCancelledRef.current) {
            nameCancelledRef.current = false;
            return;
        }
        commitName();
    }

    function startEditDescription() {
        if (!canDevelop) return;
        setDescDraft(release.description ?? '');
        setEditingDescription(true);
    }

    function saveDescription() {
        update.mutate({ description: descDraft.trim() || null });
        setEditingDescription(false);
    }

    function handleTargetDateChange(next: string) {
        update.mutate({ target_date: next || null });
    }

    return (
        <div style={{ padding: '28px 32px', maxWidth: 900 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                {editingName ? (
                    <input
                        aria-label="Release name"
                        autoFocus
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        onKeyDown={handleNameKeyDown}
                        onBlur={handleNameBlur}
                        style={{
                            fontSize: 22, fontWeight: 600, letterSpacing: '-.02em',
                            background: 'var(--panel)', border: '1px solid var(--border)',
                            borderRadius: 6, padding: '2px 8px', color: 'var(--fg)',
                            fontFamily: 'inherit', minWidth: 220,
                        }}
                    />
                ) : (
                    <h1
                        onClick={canDevelop ? startEditName : undefined}
                        title={canDevelop ? 'Click to rename' : undefined}
                        style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-.02em', cursor: canDevelop ? 'pointer' : 'default' }}
                    >
                        {release.name}
                    </h1>
                )}
                {canDevelop && !editingName && (
                    <button
                        type="button"
                        aria-label="Edit release name"
                        onClick={startEditName}
                        style={{ border: 'none', background: 'none', color: 'var(--fg3)', cursor: 'pointer', fontSize: 12.5, padding: 2, fontFamily: 'inherit' }}
                    >
                        Edit
                    </button>
                )}
                {isShipped && (
                    <span data-testid="shipped-badge" style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent2)', borderRadius: 20, padding: '2px 9px' }}>
                        Shipped {formatShippedAt(release.shipped_at)}
                    </span>
                )}
            </div>

            {canDevelop ? (
                editingDescription ? (
                    <div style={{ marginBottom: 8 }}>
                        <textarea
                            aria-label="Description"
                            autoFocus
                            value={descDraft}
                            onChange={(e) => setDescDraft(e.target.value)}
                            style={{
                                width: '100%', minHeight: 70, background: 'var(--panel)',
                                border: '1px solid var(--border)', borderRadius: 8,
                                padding: '8px 10px', fontSize: 13.5, lineHeight: 1.6,
                                color: 'var(--fg)', fontFamily: 'inherit', resize: 'vertical',
                                boxSizing: 'border-box',
                            }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                            <button type="button" style={actionBtn} onClick={saveDescription}>Save</button>
                            <button type="button" style={{ ...actionBtn, background: 'transparent' }} onClick={() => setEditingDescription(false)}>Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                        <p style={{ margin: 0, fontSize: 13.5, color: release.description ? 'var(--fg2)' : 'var(--fg3)', fontStyle: release.description ? 'normal' : 'italic', lineHeight: 1.6 }}>
                            {release.description || 'No description.'}
                        </p>
                        <button
                            type="button"
                            aria-label="Edit description"
                            onClick={startEditDescription}
                            style={{ border: 'none', background: 'none', color: 'var(--fg3)', cursor: 'pointer', fontSize: 12, padding: 2, flexShrink: 0, fontFamily: 'inherit' }}
                        >
                            Edit
                        </button>
                    </div>
                )
            ) : (
                release.description && (
                    <p style={{ margin: '0 0 8px', fontSize: 13.5, color: 'var(--fg2)', lineHeight: 1.6 }}>{release.description}</p>
                )
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--fg3)', marginBottom: 18 }}>
                <span>Target date: {formatTargetDate(release.target_date)}</span>
                {canDevelop && (
                    <input
                        type="date"
                        aria-label="Target date"
                        value={release.target_date ?? ''}
                        onChange={(e) => handleTargetDateChange(e.target.value)}
                        style={{
                            fontSize: 12, color: 'var(--fg)', background: 'var(--panel)',
                            border: '1px solid var(--border)', borderRadius: 6,
                            padding: '2px 6px', fontFamily: 'inherit',
                        }}
                    />
                )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                {canDevelop && (
                    <button type="button" style={actionBtn} onClick={() => ship.mutate(!isShipped)} disabled={ship.isPending}>
                        {isShipped ? 'Unship' : 'Mark shipped'}
                    </button>
                )}
                <button type="button" style={actionBtn} onClick={() => void copyChangelog()}>
                    {copied ? 'Copied' : 'Copy changelog'}
                </button>
                {canDevelop && (
                    <button type="button" style={{ ...actionBtn, marginLeft: 'auto', color: 'var(--red)' }} onClick={handleDelete} disabled={del.isPending}>
                        Delete
                    </button>
                )}
            </div>

            {/* Rollup bar */}
            <div style={{ marginBottom: 28 }}>
                <div style={sectionHeader}>Progress</div>
                <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: 'var(--bg2)', marginBottom: 10 }}>
                    {total === 0
                        ? null
                        : STATUS_ORDER.filter((s) => (countByStatus[s] ?? 0) > 0).map((s) => (
                            <span key={s} style={{ width: `${((countByStatus[s] ?? 0) / total) * 100}%`, background: STATUS_COLOR[s] }} />
                        ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                    {STATUS_ORDER.filter((s) => (countByStatus[s] ?? 0) > 0).map((s) => (
                        <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg2)' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[s], display: 'inline-block' }} />
                            {STATUS_LABELS[s]} <span style={{ color: 'var(--fg3)' }}>{countByStatus[s]}</span>
                        </span>
                    ))}
                    {total === 0 && <span style={{ fontSize: 12, color: 'var(--fg3)' }}>No issues in this release yet.</span>}
                </div>
            </div>

            {/* Issues */}
            <div style={sectionHeader}>Issues</div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                {release.issues.map((issue) => (
                    <Link
                        key={issue.id}
                        to={`/issues/${issue.id}`}
                        data-testid="release-issue-row"
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', textDecoration: 'none', color: 'inherit', borderBottom: '1px solid var(--border)' }}
                        className="hover:bg-hover"
                    >
                        <span style={{ width: 70, flexShrink: 0, fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'var(--fg3)' }}>{issue.ref}</span>
                        <span style={{ flex: '1 1 auto', minWidth: 0, fontSize: 13, color: 'var(--fg)' }}>{issue.title}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg2)', width: 110, flexShrink: 0 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[issue.status], display: 'inline-block' }} />
                            {STATUS_LABELS[issue.status]}
                        </span>
                        <span style={{ width: 100, flexShrink: 0, textAlign: 'right', fontSize: 12, color: 'var(--fg3)' }}>{issue.assignee?.name ?? 'Unassigned'}</span>
                    </Link>
                ))}
                {release.issues.length === 0 && (
                    <div style={{ padding: '20px 16px', fontSize: 13, color: 'var(--fg3)' }}>No issues in this release yet.</div>
                )}
            </div>
        </div>
    );
}
