import { useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    useIssue, useUpdateIssue,
    useComments, useAddComment, useActivities,
} from './hooks';
import { StatusEditor } from './StatusEditor';
import { PriorityEditor } from './PriorityEditor';
import { AssigneeEditor } from './AssigneeEditor';
import { ProjectEditor } from './ProjectEditor';
import { CycleEditor } from './CycleEditor';
import { LabelsEditor } from './LabelsEditor';
import { useGithubLinks, useAddGithubLink, useRemoveGithubLink } from './githubLinks';
import { useMe } from '../../auth/useAuth';
import { avatarFor } from '../../lib/avatarFor';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PropertyRow } from '../../components/ui/PropertyRow';
import { ApiError } from '../../lib/apiClient';

const sectionHeader: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '.05em',
    textTransform: 'uppercase',
    color: 'var(--fg3)',
    marginBottom: 8,
};

export default function IssueDetailPage() {
    const { id = '' } = useParams();
    const issue         = useIssue(id);
    const comments      = useComments(id);
    const activities    = useActivities(id);
    const addComment    = useAddComment(id);
    const updateIssue   = useUpdateIssue(id);
    const githubLinks   = useGithubLinks(id);
    const addGithubLink    = useAddGithubLink(id);
    const removeGithubLink = useRemoveGithubLink(id);
    const me            = useMe();

    const [comment, setComment] = useState('');
    const [prUrl, setPrUrl]     = useState('');
    const [error, setError]     = useState('');
    const titleRef = useRef<HTMLSpanElement>(null);

    const canDevelop = !!me.data?.is_developer && me.data?.admin_level !== 'viewer';

    if (issue.isLoading) {
        return <p style={{ padding: 24, color: 'var(--fg3)' }}>Loading…</p>;
    }
    if (issue.isError || !issue.data) {
        return <p style={{ padding: 24, color: 'var(--fg3)' }}>Issue not found.</p>;
    }

    const data       = issue.data;
    const identifier = data.identifier ?? data.id.slice(0, 6).toUpperCase();

    async function handleTitleBlur() {
        const next = titleRef.current?.textContent?.trim();
        if (next && next !== data.title) {
            setError('');
            try { await updateIssue.mutateAsync({ title: next }); }
            catch (e) { setError(e instanceof ApiError ? e.detail : 'Update failed.'); }
        }
    }

    async function handleDescBlur(e: React.FocusEvent<HTMLTextAreaElement>) {
        const next = e.target.value;
        if (next !== (data.description ?? '')) {
            setError('');
            try { await updateIssue.mutateAsync({ description: next || null }); }
            catch (e2) { setError(e2 instanceof ApiError ? e2.detail : 'Update failed.'); }
        }
    }

    async function submitComment(e: React.FormEvent) {
        e.preventDefault();
        if (!comment.trim()) return;
        await addComment.mutateAsync(comment);
        setComment('');
    }

    async function onAddPr() {
        setError('');
        try {
            await addGithubLink.mutateAsync(prUrl);
            setPrUrl('');
        } catch (e) {
            setError(e instanceof ApiError ? e.detail : 'Failed to add.');
        }
    }

    return (
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px 48px' }}>

            {/* Back link + breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 20, paddingBottom: 14 }}>
                <Link to="/" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>
                    ← Issues
                </Link>
                <span style={{ color: 'var(--fg3)', fontSize: 12 }}>·</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg3)' }}>
                    {data.team_id} ▸ <span>{identifier}</span>
                </span>
            </div>

            {/* Editable title */}
            {canDevelop ? (
                <span
                    ref={titleRef}
                    role="heading"
                    aria-level={1}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={handleTitleBlur}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); titleRef.current?.blur(); }
                    }}
                    style={{
                        display: 'block', margin: '0 0 18px',
                        fontSize: 19, fontWeight: 600,
                        lineHeight: 1.35, letterSpacing: '-.01em',
                        outline: 'none', borderRadius: 6, minHeight: 28,
                    }}
                >
                    {data.title}
                </span>
            ) : (
                <h1 style={{
                    margin: '0 0 18px',
                    fontSize: 19, fontWeight: 600,
                    lineHeight: 1.35, letterSpacing: '-.01em',
                }}>
                    {data.title}
                </h1>
            )}

            {/* Support escalation block — renders ONLY when support_ticket_id exists (always null today) */}
            {(data as any).support_ticket_id && (
                <div style={{
                    border: '1px solid var(--accent)', background: 'var(--accent2)',
                    borderRadius: 12, padding: '14px 16px', marginBottom: 22,
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        fontSize: 12, fontWeight: 600, color: 'var(--accent)',
                    }}>
                        ↩ Escalated from Support
                        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                            {(data as any).support_ticket_id}
                        </span>
                    </div>
                    <button
                        type="button"
                        style={{
                            marginTop: 12, display: 'inline-flex', alignItems: 'center',
                            gap: 6, padding: '6px 11px', borderRadius: 8,
                            border: '1px solid var(--accent)', background: 'transparent',
                            color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        Open original ticket ↗
                    </button>
                </div>
            )}

            {/* Properties panel */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 6, marginBottom: 24 }}>
                <PropertyRow label="Status">
                    <StatusEditor issue={data} canDevelop={canDevelop} />
                </PropertyRow>
                <PropertyRow label="Priority">
                    <PriorityEditor issue={data} canDevelop={canDevelop} />
                </PropertyRow>
                <PropertyRow label="Assignee">
                    <AssigneeEditor issue={data} canDevelop={canDevelop} />
                </PropertyRow>
                <PropertyRow label="Project">
                    <ProjectEditor issue={data} canDevelop={canDevelop} />
                </PropertyRow>
                <PropertyRow label="Labels">
                    <LabelsEditor issue={data} canDevelop={canDevelop} />
                </PropertyRow>
                <PropertyRow label="Cycle">
                    <CycleEditor issue={data} canDevelop={canDevelop} />
                </PropertyRow>
            </div>

            {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

            {/* Description */}
            <div style={sectionHeader}>Description</div>
            {canDevelop ? (
                <textarea
                    defaultValue={data.description ?? ''}
                    onBlur={handleDescBlur}
                    placeholder="Add a description…"
                    aria-label="Issue description"
                    style={{
                        width: '100%', minHeight: 80, background: 'none',
                        border: '1px solid transparent', borderRadius: 8,
                        padding: '8px 10px', fontSize: 13.5, lineHeight: 1.6,
                        color: 'var(--fg2)', fontFamily: 'inherit', resize: 'vertical',
                        boxSizing: 'border-box', marginBottom: 24, outline: 'none',
                    }}
                />
            ) : (
                <p style={{ margin: '0 0 24px', fontSize: 13.5, lineHeight: 1.6, color: 'var(--fg2)' }}>
                    {data.description
                        ? data.description
                        : <span style={{ color: 'var(--fg3)', fontStyle: 'italic' }}>No description.</span>}
                </p>
            )}

            {/* GitHub PR links */}
            <div style={sectionHeader}>GitHub</div>
            <ul style={{ margin: '0 0 8px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {githubLinks.data?.map((l) => (
                    <li key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <a
                            href={l.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: 'var(--accent)', textDecoration: 'none' }}
                        >
                            {l.repo} #{l.number}
                        </a>
                        <span style={{
                            borderRadius: 6, background: 'var(--hover)',
                            padding: '1px 6px', fontSize: 11, color: 'var(--fg2)',
                        }}>
                            {l.state}
                        </span>
                        {canDevelop && (
                            <button
                                type="button"
                                aria-label={`Remove ${l.repo} #${l.number}`}
                                onClick={() => removeGithubLink.mutate(l.id)}
                                style={{
                                    border: 'none', background: 'none', color: 'var(--fg3)',
                                    cursor: 'pointer', fontSize: 12, padding: 2,
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </li>
                ))}
                {githubLinks.data?.length === 0 && (
                    <li style={{ fontSize: 13, color: 'var(--fg3)' }}>No linked pull requests.</li>
                )}
            </ul>
            {canDevelop && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                    <input
                        aria-label="Add PR URL"
                        value={prUrl}
                        onChange={(e) => setPrUrl(e.target.value)}
                        placeholder="https://github.com/…/pull/123"
                        style={{
                            flex: 1, border: '1px solid var(--border)', borderRadius: 8,
                            background: 'none', padding: '6px 10px', fontSize: 13,
                            color: 'var(--fg)', fontFamily: 'inherit', outline: 'none',
                        }}
                    />
                    <Button variant="secondary" onClick={() => void onAddPr()}>Add PR</Button>
                </div>
            )}

            {/* Activity */}
            <div style={sectionHeader}>Activity</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                {(activities.data?.items ?? []).map((a) => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{
                            width: 20, height: 20, borderRadius: '50%', background: 'var(--hover)',
                            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, color: 'var(--fg3)',
                        }}>·</div>
                        <div style={{ fontSize: 12.5, color: 'var(--fg2)', lineHeight: 1.4 }}>
                            <span style={{ color: 'var(--fg)', fontWeight: 500 }}>{a.type}</span>
                            {a.to_value ? ` → ${a.to_value}` : ''}
                            <span style={{ marginLeft: 6, color: 'var(--fg3)', fontSize: 11 }}>
                                {new Date(a.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                ))}
                {(comments.data?.items ?? []).map((c) => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <Avatar size={20} />
                        <div style={{
                            fontSize: 12.5, color: 'var(--fg2)', background: 'var(--panel)',
                            border: '1px solid var(--border)', borderRadius: 8,
                            padding: '6px 10px', flex: 1,
                        }}>
                            {c.body}
                        </div>
                    </div>
                ))}
            </div>

            {/* Comment box */}
            <form onSubmit={submitComment} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar {...(me.data?.name ? avatarFor(me.data) : {})} size={24} />
                <Input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Leave a comment…"
                    aria-label="Leave a comment"
                    style={{ flex: 1 }}
                />
                <Button
                    variant="primary"
                    type="submit"
                    disabled={!comment.trim() || addComment.isPending}
                >
                    Comment
                </Button>
            </form>
        </div>
    );
}
