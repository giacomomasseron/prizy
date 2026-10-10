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
import { ReleaseEditor } from './ReleaseEditor';
import { CycleEditor } from './CycleEditor';
import { LabelsEditor } from './LabelsEditor';
import { useGithubLinks, useAddGithubLink, useRemoveGithubLink } from './githubLinks';
import { useMe } from '../../auth/useAuth';
import { canDevelop as canDevelopFor } from '../../auth/capabilities';
import { useMembers } from '../members/hooks';
import { avatarFor } from '../../lib/avatarFor';
import { timeAgo } from '../../lib/timeAgo';
import { CommentReactions } from './CommentReactions';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Input, TITLE_FIELD_CLASSES, titleFieldEdge } from '../../components/ui/Input';
import { PropertyRow } from '../../components/ui/PropertyRow';
import { StatusIcon } from '../../components/ui/StatusIcon';
import { PriorityIcon } from '../../components/ui/PriorityIcon';
import { ApiError } from '../../lib/apiClient';
import { humanizeActivityType, activityDetail } from './activityMeta';
import { commentBadge, badgeCss, badgeLabel } from './commentBadge';
import { PRIORITY_LABELS, STATUS_LABELS, issueRef } from './issueMeta';
import { StarButton } from './StarToggle';
import { sectionTitle } from './issueStyles';

// Status / priority pills above the title (display only — editing lives in the Properties card).
const headPill: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px',
    borderRadius: 'var(--radius-pill)', border: 'var(--line) solid var(--border)', background: 'var(--panel)',
    fontSize: 12.5, fontWeight: 700, color: 'var(--fg2)',
};

const titleStyle: React.CSSProperties = {
    margin: '16px 0 26px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 40,
    lineHeight: 1.08, letterSpacing: '-.035em', maxWidth: '26ch', textWrap: 'balance', color: 'var(--fg)',
};

const block: React.CSSProperties = { marginBottom: 34 };

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
    const posting = useRef(false);

    const canDevelop = canDevelopFor(me.data);

    if (issue.isLoading) {
        return <p style={{ margin: 0, padding: '24px 34px', fontSize: 15, color: 'var(--fg3)' }}>Loading…</p>;
    }
    if (issue.isError || !issue.data) {
        return <p style={{ margin: 0, padding: '24px 34px', fontSize: 15, color: 'var(--fg3)' }}>Issue not found.</p>;
    }

    const data       = issue.data;
    const identifier = issueRef(data);

    async function handleTitleBlur() {
        const el = titleRef.current;
        const next = el?.textContent?.trim();
        if (!next) {
            // An empty inline title would collapse to nothing and become unclickable — put it back.
            if (el) el.textContent = data.title;
            return;
        }
        if (next !== data.title) {
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

    async function postComment() {
        const body = comment.trim();
        if (!body || posting.current || addComment.isPending) return;
        posting.current = true;
        setError('');
        try {
            await addComment.mutateAsync(body);
            setComment('');
        } catch (e) {
            setError(e instanceof ApiError ? e.detail : 'Failed to post comment.');
        } finally {
            posting.current = false;
        }
    }

    function submitComment(e: React.FormEvent) {
        e.preventDefault();
        void postComment();
    }

    // ⌘+Enter / Ctrl+Enter posts; a plain Enter inserts a newline.
    function onCommentKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void postComment();
        }
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
        <div style={{ minHeight: '100%' }}>

            {/* Top bar: breadcrumb. The left padding clears the collapsed-sidebar button (--nav-inset). */}
            <div style={{ height: 64, display: 'flex', alignItems: 'center', gap: 8, padding: '0 34px 0 calc(34px + var(--nav-inset, 0px))' }}>
                <Link to="/" className="text-fg3 hover:text-fg" style={{ fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                    Issues
                </Link>
                <span aria-hidden="true" style={{ color: 'var(--border2)', fontSize: 14 }}>/</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg)' }}>{identifier}</span>
                <StarButton issue={data} style={{ marginLeft: 'auto' }} />
            </div>

            {error && <p style={{ color: 'var(--red-ink)', fontSize: 13, margin: '0 34px 12px' }}>{error}</p>}

            {/* Two-column layout: main content + sticky right rail */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'flex-start', padding: '22px 34px 80px' }}>

                {/* ── Main column ── */}
                <div style={{ flex: '1 1 460px', minWidth: 0 }}>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <span style={headPill}><StatusIcon status={data.status} size={13} decorative />{STATUS_LABELS[data.status]}</span>
                        <span style={headPill}><PriorityIcon priority={data.priority} decorative />{PRIORITY_LABELS[data.priority]}</span>
                    </div>

                    {/* Title (editable for developers). The highlighter sits on the element holding the
                        text; nothing else goes inside the editable span (React re-renders its text). */}
                    {canDevelop ? (
                        <div style={titleStyle}>
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
                                className={`hl ${TITLE_FIELD_CLASSES}`}
                                style={{ ...titleFieldEdge, outline: 'none' }}
                            >
                                {data.title}
                            </span>
                        </div>
                    ) : (
                        <h1 style={titleStyle}><span className="hl">{data.title}</span></h1>
                    )}

                    {/* Escalated from Support — the header pill stays a direct child of the card. */}
                    {data.support_ticket && (
                        <div style={{
                            border: 'var(--line) solid var(--fg)', borderRadius: 'var(--radius-modal)', padding: '18px 20px',
                            boxShadow: 'var(--pop-shadow)', background: 'var(--panel)', marginBottom: 30,
                        }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 11px', borderRadius: 'var(--radius-pill)', background: 'var(--accent2)', color: 'var(--accent-ink)', fontSize: 12.5, fontWeight: 700 }}>
                                ↩ Escalated from Support
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 600 }}>{data.support_ticket.ref}</span>
                            </span>
                            <div style={{ marginTop: 12, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, letterSpacing: '-.01em', color: 'var(--fg)' }}>{data.support_ticket.subject}</div>
                            <div style={{ marginTop: 6, fontSize: 13.5, color: 'var(--fg2)' }}>Customer · {data.support_ticket.customer ?? '—'} · {data.support_ticket.plan ?? '—'}</div>
                            <Link
                                to={`/support/tickets/${data.support_ticket.id}`}
                                className="bg-fg text-bg hover:bg-accent"
                                style={{
                                    marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '8px 15px', borderRadius: 'var(--radius-pill)',
                                    fontSize: 13, fontWeight: 700, textDecoration: 'none',
                                }}
                            >
                                Open original ticket ↗
                            </Link>
                        </div>
                    )}

                    {/* Description */}
                    <section style={block}>
                        <h2 style={{ ...sectionTitle(20), marginBottom: 10 }}>Description</h2>
                        {canDevelop ? (
                            <textarea
                                defaultValue={data.description ?? ''}
                                onBlur={handleDescBlur}
                                placeholder="Add a description…"
                                aria-label="Issue description"
                                className="border-transparent hover:border-border focus:border-fg"
                                style={{
                                    display: 'block', width: '100%', maxWidth: '72ch', minHeight: 96, boxSizing: 'border-box',
                                    background: 'transparent', borderWidth: 'var(--line)', borderStyle: 'solid', borderRadius: 14,
                                    padding: '10px 12px', fontSize: 16, lineHeight: 1.7, color: 'var(--fg2)',
                                    fontFamily: 'inherit', resize: 'vertical', outline: 'none', margin: 0,
                                }}
                            />
                        ) : (
                            <p style={{ margin: 0, maxWidth: '72ch', fontSize: 16, lineHeight: 1.7, color: 'var(--fg2)', whiteSpace: 'pre-wrap' }}>
                                {data.description
                                    ? data.description
                                    : <span style={{ color: 'var(--fg3)', fontStyle: 'italic' }}>No description.</span>}
                            </p>
                        )}
                    </section>

                    {/* GitHub PR links */}
                    <section style={block}>
                        <h2 style={{ ...sectionTitle(20), marginBottom: 12 }}>GitHub</h2>
                        <ul style={{ margin: '0 0 12px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {githubLinks.data?.map((l) => (
                                <li key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                                    <a href={l.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
                                        {l.repo} #{l.number}
                                    </a>
                                    <span style={{ borderRadius: 'var(--radius-pill)', background: 'var(--bg2)', padding: '1px 8px', fontSize: 11.5, fontWeight: 700, color: 'var(--fg2)' }}>
                                        {l.state}
                                    </span>
                                    {canDevelop && (
                                        <button
                                            type="button"
                                            aria-label={`Remove ${l.repo} #${l.number}`}
                                            disabled={removeGithubLink.isPending && removeGithubLink.variables === l.id}
                                            onClick={() => removeGithubLink.mutate(l.id)}
                                            className="text-fg3 hover:text-fg"
                                            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, padding: 2, fontFamily: 'inherit' }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </li>
                            ))}
                            {githubLinks.data?.length === 0 && (
                                <li style={{ fontSize: 14, color: 'var(--fg3)' }}>No linked pull requests.</li>
                            )}
                        </ul>
                        {canDevelop && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: '72ch' }}>
                                <Input
                                    aria-label="Add PR URL"
                                    value={prUrl}
                                    onChange={(e) => setPrUrl(e.target.value)}
                                    placeholder="https://github.com/…/pull/123"
                                    style={{ flex: 1 }}
                                />
                                <Button variant="secondary" disabled={addGithubLink.isPending} onClick={() => void onAddPr()}>Add PR</Button>
                            </div>
                        )}
                    </section>

                    {/* Comments */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
                        <h2 style={sectionTitle(20)}>Comments</h2>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg3)' }}>{comments.data?.items.length ?? 0}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {(comments.data?.items ?? []).map((c) => {
                            const author = memberById.get(c.user_id);
                            const badge = commentBadge(c.user_id, issue.data?.assignee_id, author?.is_agent);
                            return (
                                <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    {author ? <Avatar {...avatarFor(author)} size={34} /> : <Avatar size={34} />}
                                    <div style={{ flex: 1, minWidth: 0, border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-card)', background: 'var(--panel)', padding: '14px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>{author?.name ?? 'Unknown'}</span>
                                            {badge && <span style={badgeCss(badge)}>{badgeLabel(badge)}</span>}
                                            <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--fg3)', whiteSpace: 'nowrap' }}>{timeAgo(c.created_at)}</span>
                                        </div>
                                        <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--fg)', whiteSpace: 'pre-wrap' }}>{c.body}</div>
                                        <CommentReactions reactions={c.reactions} onToggle={(emoji) => toggleReaction.mutate({ commentId: c.id, emoji })} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Composer */}
                    <form onSubmit={submitComment} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 22 }}>
                        <Avatar {...(me.data?.name ? avatarFor(me.data) : {})} size={34} />
                        <div
                            className="border-field focus-within:border-fg"
                            style={{
                                flex: 1, minWidth: 0, borderWidth: 'var(--line)', borderStyle: 'solid',
                                borderRadius: 'var(--radius-card)', background: 'var(--panel)', padding: '12px 14px 10px',
                                transition: 'border-color .12s',
                            }}
                        >
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                onKeyDown={onCommentKeyDown}
                                placeholder="Leave a comment…"
                                aria-label="Leave a comment"
                                rows={3}
                                style={{
                                    display: 'block', width: '100%', boxSizing: 'border-box', border: 'none',
                                    background: 'transparent', resize: 'vertical', outline: 'none', padding: 0,
                                    fontSize: 15, lineHeight: 1.6, color: 'var(--fg)', fontFamily: 'inherit',
                                }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                                <span style={{ fontSize: 12.5, color: 'var(--fg3)' }}>⌘/Ctrl + Enter to post</span>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    type="submit"
                                    disabled={!comment.trim() || addComment.isPending}
                                    style={{ marginLeft: 'auto' }}
                                >
                                    Comment
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* ── Right rail: properties + activity ── */}
                <aside aria-label="Issue properties" style={{ flex: '1 1 300px', maxWidth: 340, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 28, position: 'sticky', top: 20 }}>

                    {/* Properties panel */}
                    <div style={{ border: 'var(--line) solid var(--border)', borderRadius: 20, padding: 8, background: 'var(--panel)' }}>
                        <PropertyRow label="Status" labelWidth={80}>
                            <StatusEditor issue={data} canDevelop={canDevelop} />
                        </PropertyRow>
                        <PropertyRow label="Priority" labelWidth={80}>
                            <PriorityEditor issue={data} canDevelop={canDevelop} />
                        </PropertyRow>
                        <PropertyRow label="Assignee" labelWidth={80}>
                            <AssigneeEditor issue={data} canDevelop={canDevelop} />
                        </PropertyRow>
                        <PropertyRow label="Project" labelWidth={80}>
                            <ProjectEditor issue={data} canDevelop={canDevelop} />
                        </PropertyRow>
                        <PropertyRow label="Release" labelWidth={80}>
                            <ReleaseEditor issue={data} canDevelop={canDevelop} />
                        </PropertyRow>
                        <PropertyRow label="Labels" labelWidth={80}>
                            <LabelsEditor issue={data} canDevelop={canDevelop} />
                        </PropertyRow>
                        <PropertyRow label="Cycle" labelWidth={80}>
                            <CycleEditor issue={data} canDevelop={canDevelop} />
                        </PropertyRow>
                    </div>

                    {/* Activity */}
                    <div>
                        <h3 style={{ ...sectionTitle(17), marginBottom: 14 }}>Activity</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                            {data.support_ticket && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: 'var(--on-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>↩</span>
                                    <div style={{ fontSize: 13, color: 'var(--fg3)', lineHeight: 1.5 }}>
                                        Auto-linked from support ticket <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{data.support_ticket.ref}</span> — customer context synced
                                    </div>
                                </div>
                            )}
                            {(activities.data?.items ?? []).map((a) => {
                                const actor = a.user_id ? memberById.get(a.user_id) : undefined;
                                return (
                                    <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                        {actor
                                            ? <Avatar {...avatarFor(actor)} size={22} />
                                            : <div style={{
                                                width: 22, height: 22, borderRadius: '50%', background: 'var(--hover)',
                                                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 10, color: 'var(--fg3)',
                                            }}>·</div>
                                        }
                                        <div style={{ fontSize: 13, color: 'var(--fg3)', lineHeight: 1.5 }}>
                                            <span style={{ color: 'var(--fg)', fontWeight: 600 }}>
                                                {actor ? actor.name : 'Someone'}
                                            </span>
                                            {' '}{humanizeActivityType(a.type)}
                                            {activityDetail(a.type, a.to_value)}
                                            <span style={{ marginLeft: 6, color: 'var(--fg3)', fontSize: 12 }}>
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
