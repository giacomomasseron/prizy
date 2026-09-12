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

const rowBtn = (active: boolean, indent: number): CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0,
    padding: `6px 8px 6px ${indent}px`, borderRadius: 7, border: 'none',
    background: active ? 'var(--sup2)' : 'transparent', color: active ? 'var(--sup)' : 'var(--fg)',
    fontWeight: active ? 600 : 500, fontSize: 12.8, fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer',
});
const countStyle: CSSProperties = { fontSize: 11, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' };
const caretBtn: CSSProperties = { width: 18, height: 24, flexShrink: 0, border: 'none', background: 'none', color: 'var(--fg3)', cursor: 'pointer', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const pillStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, paddingRight: 4 };

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
        const ok = await confirm({ title: 'Archive articles', message: `Archive all ${count} articles in “${name}”? They disappear from the help center.`, confirmLabel: 'Archive articles' });
        if (!ok) return;
        setError(null);
        run({ onError: (err) => onMutationError(err, 'Failed to archive the articles.') });
    }

    async function deleteNode(kind: 'category' | 'section', name: string, count: number, run: (opts: { onSuccess: () => void; onError: (e: unknown) => void }) => void) {
        const ok = await confirm({
            title: kind === 'category' ? 'Delete category' : 'Delete section',
            message: count > 0 ? `This also deletes ${count} articles inside it. Archive them instead if you want to keep them.` : `Delete “${name}”?`,
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
        <nav aria-label="Knowledge base library" style={{ width: 262, flexShrink: 0, borderRight: '1px solid var(--border)', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 14px 8px' }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--fg3)' }}>Library</div>
                <div style={{ fontSize: 11, color: 'var(--fg3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{categories.length} cat · {totalArticles} art</div>
            </div>

            <div style={{ flex: 1, padding: '0 6px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <button type="button" onClick={() => onSelect({ kind: 'all' })} style={rowBtn(node.kind === 'all', 8)}>
                    <span aria-hidden="true">▤</span>
                    <span style={{ flex: 1 }}>All articles</span>
                </button>

                {categories.map((c) => {
                    const expanded = !(collapsed[c.id] ?? false);
                    const articleCount = c.sections.reduce((n, s) => n + s.articles.length, 0);
                    const active = node.kind === 'category' && node.id === c.id;
                    return (
                        <div key={c.id}>
                            <div className="group" style={{ display: 'flex', alignItems: 'center' }}>
                                <button type="button" aria-label={expanded ? 'Collapse' : 'Expand'} onClick={() => toggle(c.id)} style={caretBtn}>
                                    <span aria-hidden="true" style={{ display: 'inline-block', transform: expanded ? 'rotate(90deg)' : 'none' }}>▶</span>
                                </button>
                                <button type="button" onClick={() => onSelect({ kind: 'category', id: c.id })} style={rowBtn(active, 0)}>
                                    <span aria-hidden="true" style={{ color: c.color }}>{c.icon}</span>
                                    <span style={{ flex: 1 }}>{c.name}</span>
                                    <span style={countStyle}>{articleCount}</span>
                                </button>
                                <span className="opacity-0 group-hover:opacity-100" style={pillStyle}>
                                    <IconButton title="Move up" onClick={() => move((opts) => moveCategory.mutate({ id: c.id, direction: 'up' }, opts), 'Failed to reorder the category.')}>▲</IconButton>
                                    <IconButton title="Move down" onClick={() => move((opts) => moveCategory.mutate({ id: c.id, direction: 'down' }, opts), 'Failed to reorder the category.')}>▼</IconButton>
                                    <Menu
                                        placement="bottom-end"
                                        trigger={<IconButton title="More actions">⋯</IconButton>}
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
                                            <div key={s.id} className="group" style={{ display: 'flex', alignItems: 'center' }}>
                                                <button type="button" onClick={() => onSelect({ kind: 'section', id: s.id, categoryId: c.id })} style={rowBtn(sActive, 30)}>
                                                    <span aria-hidden="true">·</span>
                                                    <span style={{ flex: 1 }}>{s.name}</span>
                                                    <span style={countStyle}>{s.articles.length}</span>
                                                </button>
                                                <span className="opacity-0 group-hover:opacity-100" style={pillStyle}>
                                                    <IconButton title="Move up" onClick={() => move((opts) => moveSection.mutate({ id: s.id, direction: 'up' }, opts), 'Failed to reorder the section.')}>▲</IconButton>
                                                    <IconButton title="Move down" onClick={() => move((opts) => moveSection.mutate({ id: s.id, direction: 'down' }, opts), 'Failed to reorder the section.')}>▼</IconButton>
                                                    <Menu
                                                        placement="bottom-end"
                                                        trigger={<IconButton title="More actions">⋯</IconButton>}
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
                                    <button type="button" onClick={() => onOpenModal({ kind: 'section', categoryId: c.id })} style={{ ...rowBtn(false, 30), color: 'var(--fg3)' }}>
                                        ＋ Section
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {error && <div role="alert" style={{ margin: '0 10px 10px', fontSize: 12, color: 'var(--red)' }}>{error}</div>}

            <div style={{ padding: 10 }}>
                <button type="button" onClick={() => onOpenModal({ kind: 'category' })} style={{ width: '100%', padding: '8px 10px', borderRadius: 9, border: '1px dashed var(--border2)', background: 'none', color: 'var(--fg3)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>
                    ＋ Category
                </button>
            </div>
        </nav>
    );
}
