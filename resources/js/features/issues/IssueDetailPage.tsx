import { useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    useIssue, useUpdateIssue,
    useComments, useAddComment, useActivities, useToggleReaction,
} from './hooks';
import { StatusEditor } from './StatusEditor';
import { PriorityEditor } from './PriorityEditor';
import { AssigneeEditor } from './AssigneeEditor';
import { ProjectEditor } from './ProjectEditor';
import { CycleEditor } from './CycleEditor';
import { LabelsEditor } from './LabelsEditor';
import { useGithubLinks, useAddGithubLink, useRemoveGithubLink } from './githubLinks';
import { useMe } from '../../auth/useAuth';
import { useMembers } from '../members/hooks';
import { avatarFor } from '../../lib/avatarFor';
import { timeAgo } from '../../lib/timeAgo';
import { CommentReactions } from './CommentReactions';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PropertyRow } from '../../components/ui/PropertyRow';
import { ApiError } from '../../lib/apiClient';
import { humanizeActivityType, activityDetail } from './activityMeta';
import { commentBadge, badgeCss, badgeLabel } from './commentBadge';

const sectionHeader: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '.05em',
    textTransform: 'uppercase',
    color: 'var(--fg3)',
    marginBottom: 10,
};

export default function IssueDetailPage() {
    const { id = '' } = useParams();
    const issue         = useIssue(id);
    const comments      = useComments(id);
    const activities    = useActivities(id);
    const addComment    = useAddComment(id);
    const toggleReaction = useToggleReaction(id);
    const updateIssue   = useUpdateIssue(id);
    const githubLinks   = useGithubLinks(id);
    const addGithubLink    = useAddGithubLink(id);
    const removeGithubLink = useRemoveGithubLink(id);
    const me            = useMe();
    const members       = useMembers();
    const memberById    = new Map((members.data ?? []).map(m => [m.id, m]));

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

    const titleStyle: React.CSSProperties = {
        display: 'block', margin: '0 0 22px',
        fontSize: 28, fontWeight: 600,
        lineHeight: 1.25, letterSpacing: '-.02em',
        maxWidth: '26ch', textWrap: 'balance',
    };

    return (
        <div style={{ padding: '20px 44px 0', minHeight: '100%' }}>

            {/* Back link + breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 18 }}>
                <Link to="/" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>
                    ← Issues
                </Link>
                <span style={{ color: 'var(--fg3)', fontSize: 12 }}>·</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg3)' }}>
                    {data.team_id} ▸ <span>{identifier}</span>
                </span>
            </div>

            {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

            {/* Two-column layout: main content + sticky right rail (matches Prizy Issue.dc.html) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'flex-start', paddingBottom: 80 }}>

                {/* ── Main column ── */}
                <div style={{ flex: '1 1 460px', minWidth: 0 }}>

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
                            style={{ ...titleStyle, outline: 'none', borderRadius: 6, minHeight: 34 }}
                        >
                            {data.title}
                        </span>
                    ) : (
                        <h1 style={titleStyle}>{data.title}</h1>
                    )}

                    {/* Escalated from Support */}
                    {data.support_ticket && (
                        <div style={{
                            border: '1px solid var(--accent)', background: 'var(--accent2)',
                            borderRadius: 12, padding: '16px 18px', marginBottom: 26,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: 'var(--accent)' }}>
                                ↩ Escalated from Support
                                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{data.support_ticket.ref}</span>
                            </div>
                            <div style={{ marginTop: 11, fontSize: 14, color: 'var(--fg)', fontWeight: 500 }}>{data.support_ticket.subject}</div>
                            <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--fg2)' }}>Customer · {data.support_ticket.customer ?? '—'} · {data.support_ticket.plan ?? '—'}</div>
                            <Link
                                to={`/support/tickets/${data.support_ticket.id}`}
                                style={{
                                    marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '7px 12px', borderRadius: 8, border: '1px solid var(--accent)',
                                    color: 'var(--accent)', fontSize: 12.5, fontWeight: 600, textDecoration: 'none',
                                }}
                            >
                                Open original ticket ↗
                            </Link>
                        </div>
                    )}

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
                                padding: '8px 10px', fontSize: 14.5, lineHeight: 1.65,
                                color: 'var(--fg2)', fontFamily: 'inherit', resize: 'vertical',
                                boxSizing: 'border-box', marginBottom: 30, outline: 'none',
                            }}
                        />
                    ) : (
                        <p style={{ margin: '0 0 30px', fontSize: 14.5, lineHeight: 1.65, color: 'var(--fg2)' }}>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

                    {/* Comments */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '34px 0 18px' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--fg)' }}>Comments</span>
                        <span style={{ fontSize: 12, color: 'var(--fg3)' }}>{comments.data?.items.length ?? 0}</span>
                        <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {(comments.data?.items ?? []).map((c) => {
                            const author = memberById.get(c.user_id);
                            const badge = commentBadge(c.user_id, issue.data?.assignee_id, author?.is_agent);
                            return (
                                <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                                    {author ? <Avatar {...avatarFor(author)} size={28} /> : <Avatar size={28} />}
                                    <div style={{ flex: 1, minWidth: 0, border: '1px solid var(--border)', borderRadius: 11, background: 'var(--panel)', padding: '12px 14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{author?.name ?? 'Unknown'}</span>
                                            {badge && <span style={badgeCss(badge)}>{badgeLabel(badge)}</span>}
                                            <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--fg3)', whiteSpace: 'nowrap' }}>{timeAgo(c.created_at)}</span>
                                        </div>
                                        <div style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--fg2)' }}>{c.body}</div>
                                        <CommentReactions reactions={c.reactions} onToggle={(emoji) => toggleReaction.mutate({ commentId: c.id, emoji })} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Comment box */}
                    <form onSubmit={submitComment} style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                        <Avatar {...(me.data?.name ? avatarFor(me.data) : {})} size={26} />
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

                {/* ── Right rail: properties + activity log ── */}
                <aside style={{ flex: '1 1 280px', maxWidth: 316, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 26, position: 'sticky', top: 16 }}>

                    {/* Properties panel */}
                    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 6 }}>
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

                    {/* Activity log */}
                    <div>
                        <div style={{ ...sectionHeader, marginBottom: 14 }}>Activity log</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                            {data.support_ticket && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>↩</span>
                                    <div style={{ fontSize: 12, color: 'var(--fg3)', lineHeight: 1.5 }}>
                                        Auto-linked from support ticket <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{data.support_ticket.ref}</span> — customer context synced
                                    </div>
                                </div>
                            )}
                            {(activities.data?.items ?? []).map((a) => {
                                const actor = a.user_id ? memberById.get(a.user_id) : undefined;
                                return (
                                    <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                                        {actor
                                            ? <Avatar {...avatarFor(actor)} size={20} />
                                            : <div style={{
                                                width: 20, height: 20, borderRadius: '50%', background: 'var(--hover)',
                                                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 10, color: 'var(--fg3)',
                                            }}>·</div>
                                        }
                                        <div style={{ fontSize: 12, color: 'var(--fg3)', lineHeight: 1.5 }}>
                                            <span style={{ color: 'var(--fg2)', fontWeight: 500 }}>
                                                {actor ? actor.name : 'Someone'}
                                            </span>
                                            {' '}{humanizeActivityType(a.type)}
                                            {activityDetail(a.type, a.to_value)}
                                            <span style={{ marginLeft: 6, color: 'var(--fg3)', fontSize: 11 }}>
                                                {timeAgo(a.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
