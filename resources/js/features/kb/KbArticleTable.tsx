import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/ui/Avatar';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { IconButton } from '../../components/ui/IconButton';
import { Menu, type MenuItem } from '../../components/ui/Menu';
import { avatarFor } from '../../lib/avatarFor';
import { ApiError } from '../../lib/apiClient';
import { useChangeKbArticleStatus, useDeleteKbArticle, useMoveKbArticle } from './hooks';
import { kbLabel } from './kbStyles';
import { formatViews, relativeTime } from './kbUtils';
import { StatusPill } from './StatusPill';
import type { KbArticleSummary, KbStatus } from './types';

const GRID = '100px minmax(260px,2fr) 132px 138px 100px 66px 78px';
const ellipsis: CSSProperties = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

/*
 * Full-width rows (v2). The table and its wrappers carry no `overflow`: a clipping card used to hide the ⋯ menus
 * of the last rows, while the page's scroll area grows to fit them instead. minWidth = 874 (columns) + 6 × 12 (gaps)
 * + 44 (padding).
 */
export function KbArticleTable({ articles, canReorder }: { articles: (KbArticleSummary & { sectionName: string })[]; canReorder: boolean }) {
    const navigate = useNavigate();
    const confirm = useConfirm();
    const moveArticle = useMoveKbArticle();
    const changeStatus = useChangeKbArticleStatus();
    const deleteArticle = useDeleteKbArticle();
    const [error, setError] = useState<string | null>(null);

    function onError(err: unknown, fallback: string) {
        setError(err instanceof ApiError ? err.detail : fallback);
    }

    function setStatus(a: KbArticleSummary, status: KbStatus) {
        setError(null);
        changeStatus.mutate({ id: a.id, status }, { onError: (err) => onError(err, 'Failed to update the article status.') });
    }

    async function onDelete(a: KbArticleSummary) {
        const ok = await confirm({ title: 'Delete this article?', message: 'Deleting removes the article and its URL. Customers with the link will get a 404.', confirmLabel: 'Delete article', cancelLabel: 'Keep it', danger: true });
        if (!ok) return;
        setError(null);
        deleteArticle.mutate(a.id, { onError: (err) => onError(err, 'Failed to delete the article.') });
    }

    return (
        <div>
            <div role="table" aria-label="Articles" style={{ minWidth: 990 }}>
                <div role="row" style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '9px 22px', borderBottom: '1px solid var(--border)', ...kbLabel, position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg)' }}>
                    <span>Status</span>
                    <span>Title</span>
                    <span>Section</span>
                    <span>Author</span>
                    <span>Updated</span>
                    <span style={{ textAlign: 'right' }}>Views</span>
                    <span aria-hidden="true" />
                </div>

                {articles.map((a) => {
                    const items: MenuItem[] = [
                        { key: 'edit', label: 'Edit article', onActivate: () => navigate(`/support/kb/articles/${a.id}`) },
                        { key: 'publish', label: a.status === 'published' ? 'Unpublish → Draft' : 'Publish', onActivate: () => setStatus(a, a.status === 'published' ? 'draft' : 'published') },
                        { key: 'archive', label: a.status === 'archived' ? 'Restore as draft' : 'Archive', onActivate: () => setStatus(a, a.status === 'archived' ? 'draft' : 'archived') },
                    ];
                    if (a.public_url) {
                        items.push({ key: 'open', label: 'Open on help center ↗', onActivate: () => window.open(a.public_url as string, '_blank') });
                    }
                    items.push({ key: 'delete', label: 'Delete…', danger: true, onActivate: () => onDelete(a) });

                    return (
                        <div key={a.id} role="row" className="border-b border-border hover:bg-hover" style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, alignItems: 'center', padding: '12px 22px', opacity: a.status === 'archived' ? 0.62 : 1 }}>
                            <div><StatusPill status={a.status} /></div>

                            <div style={{ minWidth: 0 }}>
                                <button
                                    type="button"
                                    aria-label={`Open ${a.title}`}
                                    onClick={() => navigate(`/support/kb/articles/${a.id}`)}
                                    className="text-fg hover:text-accent"
                                    style={{ display: 'block', maxWidth: '100%', textAlign: 'left', border: 'none', background: 'none', padding: 0, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', ...ellipsis }}
                                >
                                    {a.title}
                                </button>
                                <div style={{ marginTop: 2, fontSize: 11, color: 'var(--fg3)', fontFamily: 'var(--font-mono)', ...ellipsis }}>/{a.slug}</div>
                            </div>

                            <span style={{ fontSize: 12.5, color: 'var(--fg2)', ...ellipsis }}>{a.sectionName}</span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                <Avatar {...avatarFor(a.author)} size={22} />
                                <span style={{ fontSize: 12.5, color: 'var(--fg2)', ...ellipsis }}>{a.author.name}</span>
                            </div>

                            <span style={{ fontSize: 12, color: 'var(--fg2)', whiteSpace: 'nowrap' }}>Updated {relativeTime(a.updated_at)}</span>

                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg2)', textAlign: 'right' }}>{formatViews(a.views_count)}</span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
                                {canReorder && (
                                    <>
                                        <IconButton title="Move up" onClick={() => moveArticle.mutate({ id: a.id, direction: 'up' }, { onError: (err) => onError(err, 'Failed to reorder the article.') })}>▲</IconButton>
                                        <IconButton title="Move down" onClick={() => moveArticle.mutate({ id: a.id, direction: 'down' }, { onError: (err) => onError(err, 'Failed to reorder the article.') })}>▼</IconButton>
                                    </>
                                )}
                                <Menu placement="bottom-end" trigger={<IconButton title="More actions">⋯</IconButton>} items={items} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {error && <div role="alert" style={{ margin: '10px 22px', fontSize: 12.5, color: 'var(--red-ink)' }}>{error}</div>}
        </div>
    );
}
