import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Drawer } from '../../components/ui/Drawer';
import { Avatar } from '../../components/ui/Avatar';
import { IconButton } from '../../components/ui/IconButton';
import { Input } from '../../components/ui/Input';
import { avatarFor } from '../../lib/avatarFor';
import { timeAgo } from '../../lib/timeAgo';
import { ApiError } from '../../lib/apiClient';
import { useIssue, useActivities, useComments, useAddComment, useUpdateIssue } from './hooks';
import { useMembers } from '../members/hooks';
import { useMe } from '../../auth/useAuth';
import { canDevelop } from '../../auth/capabilities';
import { humanizeActivityType, activityDetail } from './activityMeta';
import { commentBadge, badgeCss, badgeLabel } from './commentBadge';
import { issueRef } from './issueMeta';
import { StarButton } from './StarToggle';
import { sectionTitle } from './issueStyles';
import { PeekProperties } from './PeekProperties';
import { PeekTextField } from './PeekTextField';

const sectionHead: React.CSSProperties = { ...sectionTitle(16), marginBottom: 10 };
const muted: React.CSSProperties = { fontSize: 13.5, color: 'var(--fg3)' };
const titleType: React.CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.03em', color: 'var(--fg)' };
// The fields read as text until hovered or focused (Prizy v2); their border and ground colours are classes so hover
// and focus can change them.
const fieldEdge: React.CSSProperties = {
    display: 'block', boxSizing: 'border-box', width: 'calc(100% + 16px)', margin: '0 0 0 -8px',
    borderWidth: 'var(--line)', borderStyle: 'solid', borderRadius: 10,
};
const FIELD_CLASSES = 'border-transparent bg-transparent hover:border-border focus:border-fg focus:bg-bg';

export interface PeekDrawerProps {
    issueId: string | null;
    onClose(): void;
}

export function PeekDrawer({ issueId, onClose }: PeekDrawerProps): React.ReactElement | null {
    // Everything inside belongs to one issue: a save still running when the drawer closes, or moves to another issue,
    // refreshes the issue it was made on, and a failed save's message stays with it.
    return issueId ? <PeekIssue key={issueId} issueId={issueId} onClose={onClose} /> : null;
}

function PeekIssue({ issueId, onClose }: { issueId: string; onClose(): void }): React.ReactElement {
    const issue       = useIssue(issueId);
    const activities  = useActivities(issueId);
    const comments    = useComments(issueId);
    const addComment  = useAddComment(issueId);
    const update      = useUpdateIssue(issueId);
    const members     = useMembers();
    const me          = useMe();
    const [comment, setComment] = useState('');
    const [error, setError] = useState('');

    const memberById = new Map((members.data ?? []).map((m) => [m.id, m]));
    const data = issue.data;
    // The same write access as the full page (developers and owners); everyone else reads.
    const canEdit = canDevelop(me.data);

    // Each save reports its own failure (a promise per save: `mutate`'s callbacks only reach the latest one).
    function track(saving: Promise<unknown>, undo?: () => void) {
        setError('');
        saving.catch((e: unknown) => {
            setError(e instanceof ApiError ? e.detail : 'Update failed.');
            undo?.();
        });
    }

    function save(fields: { title: string } | { description: string | null }, undo: () => void) {
        track(update.mutateAsync(fields), undo);
    }

    function submitComment(e: React.FormEvent) {
        e.preventDefault();
        const body = comment.trim();
        if (!body) return;
        addComment.mutate(body, { onSuccess: () => setComment('') });
    }

    function renderContent() {
        if (issue.isLoading) return <p style={{ ...muted, margin: 0 }}>Loading…</p>;
        if (!data)           return <p style={{ ...muted, margin: 0 }}>Issue not found.</p>;

        const st = data.support_ticket;

        return (
            <>
                {/* Title */}
                {canEdit ? (
                    <PeekTextField
                        key={`title:${data.id}`}
                        value={data.title}
                        onSave={(title, undo) => save({ title }, undo)}
                        singleLine
                        label="Issue title"
                        placeholder="Issue title"
                        className={FIELD_CLASSES}
                        style={{ ...fieldEdge, ...titleType, padding: '4px 8px' }}
                    />
                ) : (
                    <h1 style={{ ...titleType, margin: 0, textWrap: 'balance' }}>{data.title}</h1>
                )}
                {error && <p role="alert" style={{ margin: 0, fontSize: 13, color: 'var(--red-ink)' }}>{error}</p>}

                {/* Escalation banner */}
                {st && (
                    <div style={{ border: 'var(--line) solid var(--accent)', background: 'var(--accent2)', borderRadius: 14, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: 'var(--accent-ink)' }}>
                            ↩ Escalated from Support
                            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{st.ref}</span>
                        </div>
                        <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{st.subject}</div>
                        <div style={{ marginTop: 5, fontSize: 12.5, color: 'var(--fg2)' }}>Customer · {st.customer ?? '—'} · {st.plan ?? '—'}</div>
                        <Link
                            to={`/support/tickets/${st.id}`}
                            onClick={onClose}
                            className="border-accent text-accent-ink hover:bg-accent hover:text-on-accent"
                            style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--radius-pill)', borderWidth: 'var(--line)', borderStyle: 'solid', fontSize: 12.5, fontWeight: 700, textDecoration: 'none' }}
                        >
                            Open original ticket ↗
                        </Link>
                    </div>
                )}

                <PeekProperties issue={data} canEdit={canEdit} track={track} />

                {/* Description */}
                <section>
                    <h2 style={sectionHead}>Description</h2>
                    {canEdit ? (
                        <PeekTextField
                            key={`description:${data.id}`}
                            value={data.description ?? ''}
                            onSave={(description, undo) => save({ description: description || null }, undo)}
                            label="Issue description"
                            placeholder="Add a description…"
                            className={`${FIELD_CLASSES} text-fg2 focus:text-fg`}
                            style={{ ...fieldEdge, minHeight: 80, padding: 8, fontFamily: 'inherit', fontSize: 13.5, lineHeight: 1.6 }}
                        />
                    ) : (
                        <div style={{ fontSize: 13.5, color: 'var(--fg2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                            {data.description ? data.description : <span style={{ color: 'var(--fg3)', fontStyle: 'italic' }}>No description.</span>}
                        </div>
                    )}
                </section>

                {/* Activity */}
                <section>
                    <h2 style={sectionHead}>Activity</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {st && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', color: 'var(--on-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>↩</span>
                                <div style={{ fontSize: 12.5, color: 'var(--fg2)', lineHeight: 1.45 }}>
                                    Auto-linked from support ticket <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{st.ref}</span> — customer context synced
                                </div>
                            </div>
                        )}
                        {(activities.data?.items ?? []).map((a) => {
                            const actor = a.user_id ? memberById.get(a.user_id) : undefined;
                            return (
                                <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                    {actor ? <Avatar {...avatarFor(actor)} size={20} /> : <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--hover)', flexShrink: 0 }} />}
                                    <div style={{ fontSize: 12.5, color: 'var(--fg2)', lineHeight: 1.45 }}>
                                        <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{actor ? actor.name : 'Someone'}</span>{' '}
                                        {humanizeActivityType(a.type)}{activityDetail(a.type, a.to_value)}
                                        <span style={{ marginLeft: 6, color: 'var(--fg3)', fontSize: 11.5 }}>{timeAgo(a.created_at)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Comments */}
                <section>
                    <h2 style={sectionHead}>Comments <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, color: 'var(--fg3)' }}>{comments.data?.items.length ?? 0}</span></h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {(comments.data?.items ?? []).map((c) => {
                            const author = memberById.get(c.user_id);
                            const badge = commentBadge(c.user_id, data.assignee_id, author?.is_agent);
                            return (
                                <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                    {author ? <Avatar {...avatarFor(author)} size={24} /> : <Avatar size={24} />}
                                    <div style={{ flex: 1, minWidth: 0, border: 'var(--line) solid var(--border)', borderRadius: 14, background: 'var(--panel)', padding: '10px 12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>{author?.name ?? 'Unknown'}</span>
                                            {badge && <span style={badgeCss(badge)}>{badgeLabel(badge)}</span>}
                                            <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--fg3)', whiteSpace: 'nowrap' }}>{timeAgo(c.created_at)}</span>
                                        </div>
                                        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--fg2)', whiteSpace: 'pre-wrap' }}>{c.body}</div>
                                    </div>
                                </div>
                            );
                        })}
                        <form onSubmit={submitComment} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 2 }}>
                            <Avatar {...(me.data?.name ? avatarFor(me.data) : {})} size={24} />
                            <Input
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Leave a comment…"
                                aria-label="Leave a comment"
                                style={{ flex: 1, minWidth: 0, fontSize: 13.5, padding: '8px 14px' }}
                            />
                        </form>
                    </div>
                </section>
            </>
        );
    }

    return (
        <Drawer open onClose={onClose} side="right" width={520} label={data ? `${issueRef(data)} ${data.title}` : 'Issue'}>
            {/* Header stays at the top while the panel scrolls; Close is always available. */}
            <div style={{ position: 'sticky', top: 0, zIndex: 1, flexShrink: 0, background: 'var(--panel)', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                {data && (
                    <>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg3)' }}>
                            {issueRef(data)}
                        </span>
                        <StarButton issue={data} style={{ marginLeft: 'auto' }} />
                        <Link
                            to={`/issues/${data.id}`}
                            onClick={onClose}
                            title="Open full page"
                            className="border-border text-fg2 hover:border-fg hover:text-fg"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 'var(--radius-pill)', borderWidth: 'var(--line)', borderStyle: 'solid', fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}
                        >
                            Open full page ↗
                        </Link>
                    </>
                )}
                <IconButton title="Close" onClick={onClose} style={data ? undefined : { marginLeft: 'auto' }}>✕</IconButton>
            </div>
            <div style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 22 }}>
                {renderContent()}
            </div>
        </Drawer>
    );
}
