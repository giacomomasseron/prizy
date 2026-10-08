import { useState, type CSSProperties } from 'react';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { IconButton } from '../../components/ui/IconButton';
import { Menu } from '../../components/ui/Menu';
import { ApiError } from '../../lib/apiClient';
import {
    useArchiveKbCategoryArticles,
    useArchiveKbSectionArticles,
    useDeleteKbCategory,
    useDeleteKbSection,
    useMoveKbCategory,
    useMoveKbSection,
} from './hooks';
import { kbLabel } from './kbStyles';
import type { NodeModalState } from './KbNodeModal';
import type { KbCategoryNode } from './types';

export type TreeNode = { kind: 'all' } | { kind: 'category'; id: string } | { kind: 'section'; id: string; categoryId: string };

export interface KbTreeProps {
    categories: KbCategoryNode[];
    node: TreeNode;
    onSelect(node: TreeNode): void;
    totalArticles: number;
    onOpenModal(state: NodeModalState): void;
}

// Layout only for inactive rows; their colours live in rowClasses() so the hover shows.
const rowBtn = (active: boolean, indent: number): CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0,
    padding: `6px 9px 6px ${indent}px`, borderRadius: 'var(--radius-pill)', border: 'none',
    fontWeight: active ? 600 : 500, fontSize: 13.4, fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer',
    ...(active ? { background: 'var(--panel)', boxShadow: '0 0 0 1.5px var(--border)', color: 'var(--fg)' } : {}),
});
const rowClasses = (active: boolean): string => (active ? '' : 'bg-transparent text-fg2 hover:bg-hover');
const nameStyle: CSSProperties = { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const countStyle: CSSProperties = { fontSize: 11, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' };
const caretBtn: CSSProperties = { width: 18, height: 24, flexShrink: 0, border: 'none', background: 'none', color: 'var(--fg3)', cursor: 'pointer', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const rowWrap: CSSProperties = { position: 'relative', display: 'flex', alignItems: 'center' };
// Overlays the row's right end on hover or keyboard focus (opacity + pointer-events live in ACTION_PILL_CLASSES).
const actionPill: CSSProperties = {
    position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 1,
    padding: 1, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)',
};
const ACTION_PILL_CLASSES = 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto';
const arrowBtn: CSSProperties = { width: 24, height: 24, fontSize: 9 };
const moreBtn: CSSProperties = { width: 24, height: 24, fontSize: 13 };

export function KbTree({ categories, node, onSelect, totalArticles, onOpenModal }: KbTreeProps) {
    const confirm = useConfirm();
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [error, setError] = useState<string | null>(null);
    const moveCategory = useMoveKbCategory();
    const moveSection = useMoveKbSection();
    const archiveCategoryArticles = useArchiveKbCategoryArticles();
    const archiveSectionArticles = useArchiveKbSectionArticles();
    const deleteCategory = useDeleteKbCategory();
    const deleteSection = useDeleteKbSection();

    function toggle(id: string) {
        setCollapsed((m) => ({ ...m, [id]: !(m[id] ?? false) }));
    }

    function onMutationError(err: unknown, fallback: string) {
        setError(err instanceof ApiError ? err.detail : fallback);
    }

    function move(mutate: (opts: { onError: (e: unknown) => void }) => void, fallback: string) {
        setError(null);
        mutate({ onError: (err) => onMutationError(err, fallback) });
    }

    async function archiveArticles(name: string, count: number, run: (opts: { onError: (e: unknown) => void }) => void) {
        const ok = await confirm({ title: 'Archive articles', message: `Archive all ${count} articles in "${name}"? They disappear from the help center.`, confirmLabel: 'Archive articles' });
        if (!ok) return;
        setError(null);
        run({ onError: (err) => onMutationError(err, 'Failed to archive the articles.') });
    }

    async function deleteNode(kind: 'category' | 'section', name: string, count: number, run: (opts: { onSuccess: () => void; onError: (e: unknown) => void }) => void) {
        const ok = await confirm({
            title: kind === 'category' ? 'Delete category' : 'Delete section',
            message: count > 0 ? `This also deletes ${count} articles inside it. Archive them instead if you want to keep them.` : `Delete "${name}"?`,
            confirmLabel: kind === 'category' ? 'Delete category' : 'Delete section',
            danger: true,
        });
        if (!ok) return;
        setError(null);
        run({
            onSuccess: () => onSelect({ kind: 'all' }),
            onError: (err) => onMutationError(err, `Failed to delete the ${kind}.`),
        });
    }

    return (
        <nav aria-label="Knowledge base library" style={{ width: 262, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '14px 16px 8px' }}>
                <span style={kbLabel}>Library</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>{categories.length} cat · {totalArticles} art</span>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 8px 12px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <button type="button" onClick={() => onSelect({ kind: 'all' })} className={rowClasses(node.kind === 'all')} style={rowBtn(node.kind === 'all', 9)}>
                    <span aria-hidden="true">▤</span>
                    <span style={nameStyle}>All articles</span>
                </button>

                {categories.map((c) => {
                    const expanded = !(collapsed[c.id] ?? false);
                    const articleCount = c.sections.reduce((n, s) => n + s.articles.length, 0);
                    const active = node.kind === 'category' && node.id === c.id;
                    return (
                        <div key={c.id}>
                            <div className="group" style={rowWrap}>
                                <button type="button" aria-label={expanded ? 'Collapse' : 'Expand'} onClick={() => toggle(c.id)} style={caretBtn}>
                                    <span aria-hidden="true" style={{ display: 'inline-block', transform: expanded ? 'rotate(90deg)' : 'none' }}>▶</span>
                                </button>
                                <button type="button" onClick={() => onSelect({ kind: 'category', id: c.id })} className={rowClasses(active)} style={rowBtn(active, 0)}>
                                    <span aria-hidden="true" style={{ color: c.color }}>{c.icon}</span>
                                    <span style={nameStyle}>{c.name}</span>
                                    <span style={countStyle}>{articleCount}</span>
                                </button>
                                <span data-testid={`tree-actions-${c.id}`} className={ACTION_PILL_CLASSES} style={actionPill}>
                                    <IconButton title="Move up" style={arrowBtn} onClick={() => move((opts) => moveCategory.mutate({ id: c.id, direction: 'up' }, opts), 'Failed to reorder the category.')}>▲</IconButton>
                                    <IconButton title="Move down" style={arrowBtn} onClick={() => move((opts) => moveCategory.mutate({ id: c.id, direction: 'down' }, opts), 'Failed to reorder the category.')}>▼</IconButton>
                                    <Menu
                                        placement="bottom-end"
                                        trigger={<IconButton title="More actions" style={moreBtn}>⋯</IconButton>}
                                        items={[
                                            { key: 'edit', label: 'Edit…', onActivate: () => onOpenModal({ kind: 'category', category: c }) },
                                            { key: 'archive', label: 'Archive articles', onActivate: () => archiveArticles(c.name, articleCount, (opts) => archiveCategoryArticles.mutate(c.id, opts)) },
                                            { key: 'delete', label: 'Delete…', danger: true, onActivate: () => deleteNode('category', c.name, articleCount, (opts) => deleteCategory.mutate(c.id, opts)) },
                                        ]}
                                    />
                                </span>
                            </div>

                            {expanded && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {c.sections.map((s) => {
                                        const sActive = node.kind === 'section' && node.id === s.id;
                                        return (
                                            <div key={s.id} className="group" style={rowWrap}>
                                                <button type="button" onClick={() => onSelect({ kind: 'section', id: s.id, categoryId: c.id })} className={rowClasses(sActive)} style={rowBtn(sActive, 30)}>
                                                    <span aria-hidden="true">·</span>
                                                    <span style={nameStyle}>{s.name}</span>
                                                    <span style={countStyle}>{s.articles.length}</span>
                                                </button>
                                                <span className={ACTION_PILL_CLASSES} style={actionPill}>
                                                    <IconButton title="Move up" style={arrowBtn} onClick={() => move((opts) => moveSection.mutate({ id: s.id, direction: 'up' }, opts), 'Failed to reorder the section.')}>▲</IconButton>
                                                    <IconButton title="Move down" style={arrowBtn} onClick={() => move((opts) => moveSection.mutate({ id: s.id, direction: 'down' }, opts), 'Failed to reorder the section.')}>▼</IconButton>
                                                    <Menu
                                                        placement="bottom-end"
                                                        trigger={<IconButton title="More actions" style={moreBtn}>⋯</IconButton>}
                                                        items={[
                                                            { key: 'edit', label: 'Edit…', onActivate: () => onOpenModal({ kind: 'section', categoryId: c.id, section: s }) },
                                                            { key: 'archive', label: 'Archive articles', onActivate: () => archiveArticles(s.name, s.articles.length, (opts) => archiveSectionArticles.mutate(s.id, opts)) },
                                                            { key: 'delete', label: 'Delete…', danger: true, onActivate: () => deleteNode('section', s.name, s.articles.length, (opts) => deleteSection.mutate(s.id, opts)) },
                                                        ]}
                                                    />
                                                </span>
                                            </div>
                                        );
                                    })}
                                    <button type="button" onClick={() => onOpenModal({ kind: 'section', categoryId: c.id })} className="bg-transparent text-fg3 hover:bg-hover hover:text-fg" style={rowBtn(false, 30)}>
                                        ＋ Section
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {error && <div role="alert" style={{ margin: '0 10px 10px', fontSize: 12, color: 'var(--red)' }}>{error}</div>}

            <div style={{ padding: 8, borderTop: '1px solid var(--border)' }}>
                <button
                    type="button"
                    onClick={() => onOpenModal({ kind: 'category' })}
                    className="border-border2 bg-transparent text-fg2 hover:border-fg hover:text-fg"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 'var(--radius-pill)', borderWidth: 'var(--line)', borderStyle: 'dashed', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}
                >
                    ＋ Category
                </button>
            </div>
        </nav>
    );
}
