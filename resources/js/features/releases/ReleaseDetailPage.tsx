import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { canDevelop as canDevelopFor } from '../../auth/capabilities';
import { useDeleteRelease, useRelease, useShipRelease, useUpdateRelease } from './hooks';
import { buildChangelog } from './changelog';
import { formatTargetDate } from './formatDate';
import { STATUS_LABELS } from '../issues/StatusEditor';
import type { IssueStatus } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { FIELD_CLASSES } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { sectionTitle } from '../issues/issueStyles';
import { pageTitle } from '../projects/projectStyles';
import { DANGER_PILL_CLASSES, pillBtn } from '../settings/settingsStyles';

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

const sectionHeader: CSSProperties = { ...sectionTitle(17), marginBottom: 12 };
/** Detail-page frame; the left pad clears the floating "Expand sidebar" button when the sidebar is hidden. */
const frame: CSSProperties = { padding: '26px 30px 80px calc(30px + var(--nav-inset, 0px))', maxWidth: 960, boxSizing: 'border-box' };
/** "Edit" affordances: quiet text buttons whose colour lives in classes. */
const editBtn: CSSProperties = { border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 2, fontFamily: 'inherit', flexShrink: 0 };
const EDIT_BTN_CLASSES = 'text-fg3 hover:text-fg';

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
        return <p style={{ margin: 0, padding: 28, fontSize: 14, color: 'var(--fg3)' }}>Loading…</p>;
    }
    if (releaseQ.isError || !releaseQ.data) {
        return <p style={{ margin: 0, padding: 28, fontSize: 14, color: 'var(--fg3)' }}>Release not found.</p>;
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
        <div style={frame}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                {editingName ? (
                    <input
                        aria-label="Release name"
                        autoFocus
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        onKeyDown={handleNameKeyDown}
                        onBlur={handleNameBlur}
                        className={FIELD_CLASSES}
                        style={{
                            fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, letterSpacing: '-.03em',
                            background: 'var(--panel)', borderRadius: 12, padding: '2px 10px', color: 'var(--fg)',
                            outline: 'none', minWidth: 260,
                        }}
                    />
                ) : (
                    <h1
                        onClick={canDevelop ? startEditName : undefined}
                        title={canDevelop ? 'Click to rename' : undefined}
                        style={{ ...pageTitle, cursor: canDevelop ? 'pointer' : 'default' }}
                    >
                        <span className="hl">{release.name}</span>
                    </h1>
                )}
                {canDevelop && !editingName && (
                    <button type="button" aria-label="Edit release name" onClick={startEditName} style={editBtn} className={EDIT_BTN_CLASSES}>
                        Edit
                    </button>
                )}
                {isShipped && (
                    // Ink text with a green dot: small green-on-green text would be hard to read.
                    <span
                        data-testid="shipped-badge"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '3px 11px', borderRadius: 'var(--radius-pill)', border: 'var(--line) solid var(--border2)', fontSize: 12.5, fontWeight: 700, color: 'var(--fg)' }}
                    >
                        <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
                        Shipped {formatShippedAt(release.shipped_at)}
                    </span>
                )}
            </div>

            {canDevelop ? (
                editingDescription ? (
                    <div style={{ marginBottom: 10 }}>
                        <Textarea
                            aria-label="Description"
                            autoFocus
                            value={descDraft}
                            onChange={(e) => setDescDraft(e.target.value)}
                            style={{ minHeight: 80, fontSize: 14, lineHeight: 1.6 }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <Button size="sm" onClick={saveDescription}>Save</Button>
                            <Button variant="secondary" size="sm" onClick={() => setEditingDescription(false)}>Cancel</Button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                        <p style={{ margin: 0, fontSize: 15, color: release.description ? 'var(--fg2)' : 'var(--fg3)', fontStyle: release.description ? 'normal' : 'italic', lineHeight: 1.6 }}>
                            {release.description || 'No description.'}
                        </p>
                        <button type="button" aria-label="Edit description" onClick={startEditDescription} style={editBtn} className={EDIT_BTN_CLASSES}>
                            Edit
                        </button>
                    </div>
                )
            ) : (
                release.description && (
                    <p style={{ margin: '0 0 10px', fontSize: 15, color: 'var(--fg2)', lineHeight: 1.6 }}>{release.description}</p>
                )
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--fg3)', marginBottom: 20 }}>
                <span>Target date: {formatTargetDate(release.target_date)}</span>
                {canDevelop && (
                    <input
                        type="date"
                        aria-label="Target date"
                        value={release.target_date ?? ''}
                        onChange={(e) => handleTargetDateChange(e.target.value)}
                        className={FIELD_CLASSES}
                        style={{ background: 'var(--panel)', borderRadius: 'var(--radius-pill)', color: 'var(--fg)', fontSize: 13, padding: '6px 12px', fontFamily: 'inherit', outline: 'none' }}
                    />
                )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
                {canDevelop && (
                    <Button size="sm" variant={isShipped ? 'secondary' : 'primary'} onClick={() => ship.mutate(!isShipped)} disabled={ship.isPending}>
                        {isShipped ? 'Unship' : 'Mark shipped'}
                    </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => void copyChangelog()}>
                    {copied ? 'Copied' : 'Copy changelog'}
                </Button>
                {canDevelop && (
                    <button type="button" style={{ ...pillBtn, marginLeft: 'auto' }} className={DANGER_PILL_CLASSES} onClick={handleDelete} disabled={del.isPending}>
                        Delete
                    </button>
                )}
            </div>

            {/* Rollup bar */}
            <div style={{ marginBottom: 30 }}>
                <div style={sectionHeader}>Progress</div>
                <div style={{ display: 'flex', height: 10, borderRadius: 'var(--radius-pill)', overflow: 'hidden', background: 'var(--bg2)', marginBottom: 12 }}>
                    {total === 0
                        ? null
                        : STATUS_ORDER.filter((s) => (countByStatus[s] ?? 0) > 0).map((s) => (
                            <span key={s} style={{ width: `${((countByStatus[s] ?? 0) / total) * 100}%`, background: STATUS_COLOR[s] }} />
                        ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    {STATUS_ORDER.filter((s) => (countByStatus[s] ?? 0) > 0).map((s) => (
                        <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--fg2)' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[s], display: 'inline-block' }} />
                            {STATUS_LABELS[s]} <span style={{ color: 'var(--fg3)' }}>{countByStatus[s]}</span>
                        </span>
                    ))}
                    {total === 0 && <span style={{ fontSize: 13, color: 'var(--fg3)' }}>No issues in this release yet.</span>}
                </div>
            </div>

            {/* Issues */}
            <div style={sectionHeader}>Issues</div>
            <div style={{ border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-card)', background: 'var(--panel)', overflow: 'hidden' }}>
                {release.issues.map((issue) => (
                    // Separator + hover are classes (an inline background would beat hover:).
                    <Link
                        key={issue.id}
                        to={`/issues/${issue.id}`}
                        data-testid="release-issue-row"
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', textDecoration: 'none', color: 'inherit' }}
                        className="border-b border-border last:border-b-0 hover:bg-hover"
                    >
                        <span style={{ width: 70, flexShrink: 0, fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'var(--fg3)' }}>{issue.ref}</span>
                        <span style={{ flex: '1 1 auto', minWidth: 0, fontSize: 14, color: 'var(--fg)' }}>{issue.title}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--fg2)', width: 110, flexShrink: 0 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[issue.status], display: 'inline-block' }} />
                            {STATUS_LABELS[issue.status]}
                        </span>
                        <span style={{ width: 110, flexShrink: 0, textAlign: 'right', fontSize: 12.5, color: 'var(--fg3)' }}>{issue.assignee?.name ?? 'Unassigned'}</span>
                    </Link>
                ))}
                {release.issues.length === 0 && (
                    <div style={{ padding: '22px 18px', fontSize: 13.5, color: 'var(--fg3)' }}>No issues in this release yet.</div>
                )}
            </div>
        </div>
    );
}
