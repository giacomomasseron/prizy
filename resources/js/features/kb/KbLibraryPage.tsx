import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KbShell } from './KbShell';
import { KbTree, type TreeNode } from './KbTree';
import { KbArticleTable } from './KbArticleTable';
import { KbNodeModal, type NodeModalState } from './KbNodeModal';
import { useKbLibrary } from './hooks';
import type { KbArticleSummary, KbStatus } from './types';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

type Filter = 'all' | KbStatus;

export default function KbLibraryPage() {
    const lib = useKbLibrary();
    const navigate = useNavigate();
    const [node, setNode] = useState<TreeNode>({ kind: 'all' });
    const [filter, setFilter] = useState<Filter>('all');
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState<NodeModalState | null>(null);
    const categories = lib.data?.categories ?? [];

    const scope = useMemo(() => {
        if (node.kind === 'category') {
            const c = categories.find((x) => x.id === node.id);
            return { title: c?.name ?? '', description: c?.description ?? '', crumb: `Library › ${c?.name ?? ''}`, articles: c?.sections.flatMap((s) => s.articles.map((a) => ({ ...a, sectionName: s.name }))) ?? [] };
        }
        if (node.kind === 'section') {
            const c = categories.find((x) => x.id === node.categoryId);
            const s = c?.sections.find((x) => x.id === node.id);
            return { title: s?.name ?? '', description: `Section of ${c?.name ?? ''} · ${s?.articles.length ?? 0} articles`, crumb: `Library › ${c?.name ?? ''}`, articles: s?.articles.map((a) => ({ ...a, sectionName: s.name })) ?? [] };
        }
        return { title: 'All articles', description: 'Everything in the knowledge base, newest ordering first.', crumb: 'Library', articles: categories.flatMap((c) => c.sections.flatMap((s) => s.articles.map((a) => ({ ...a, sectionName: s.name })))) };
    }, [node, categories]);

    const counts = useMemo(() => ({
        all: scope.articles.length,
        draft: scope.articles.filter((a) => a.status === 'draft').length,
        published: scope.articles.filter((a) => a.status === 'published').length,
        archived: scope.articles.filter((a) => a.status === 'archived').length,
    }), [scope.articles]);
    const q = search.trim().toLowerCase();
    const visible = scope.articles.filter((a) => (filter === 'all' || a.status === filter) && (!q || a.title.toLowerCase().includes(q) || a.slug.includes(q)));
    const filtered = filter !== 'all' || q !== '';
    const totalArticles = categories.reduce((n, c) => n + c.sections.reduce((m, s) => m + s.articles.length, 0), 0);
    const newArticleSection = node.kind === 'section' ? node.id : node.kind === 'category' ? categories.find((c) => c.id === node.id)?.sections[0]?.id : categories[0]?.sections[0]?.id;

    return (
        <KbShell>
            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
                <KbTree categories={categories} node={node} onSelect={setNode} totalArticles={totalArticles} onOpenModal={setModal} />
                <section style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '18px 24px', overflow: 'auto' }}>
                    <div style={{ fontSize: 11.5, color: 'var(--fg3)' }}>{scope.crumb}</div>
                    <h1 style={{ fontSize: 17, fontWeight: 600, margin: '4px 0 2px' }}>{scope.title}</h1>
                    <div style={{ fontSize: 12, color: 'var(--fg3)', marginBottom: 14 }}>{scope.description}</div>
                    {categories.length === 0 && lib.isSuccess ? (
                        <EmptyState title="No categories yet" body="Categories are the top-level topics customers browse on the help center." action="＋ First category" onAction={() => setModal({ kind: 'category' })} />
                    ) : (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                                <SegmentedControl<Filter> value={filter} onChange={setFilter} options={[
                                    { value: 'all', label: `All ${counts.all}` }, { value: 'draft', label: `Draft ${counts.draft}` },
                                    { value: 'published', label: `Published ${counts.published}` }, { value: 'archived', label: `Archived ${counts.archived}` },
                                ]} />
                                <Input placeholder="Search titles" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 220 }} />
                                <div style={{ flex: 1 }} />
                                <Button onClick={() => navigate(newArticleSection ? `/support/kb/new?section=${newArticleSection}` : '/support/kb/new')}>＋ New article</Button>
                            </div>
                            {visible.length === 0 ? (
                                filtered
                                    ? <EmptyState title="Nothing matches those filters" body="Clear the search or switch the status filter to see everything in this section." action="＋ New article here" onAction={() => navigate(newArticleSection ? `/support/kb/new?section=${newArticleSection}` : '/support/kb/new')} />
                                    : <EmptyState title="No articles in here yet" body="Write the first one — it stays a draft until you publish it." action="＋ New article here" onAction={() => navigate(newArticleSection ? `/support/kb/new?section=${newArticleSection}` : '/support/kb/new')} />
                            ) : (
                                <KbArticleTable articles={visible} canReorder={node.kind === 'section' && !filtered} />
                            )}
                        </>
                    )}
                </section>
            </div>
            <KbNodeModal state={modal} categories={categories} onClose={() => setModal(null)} onCreated={(n) => setNode(n)} />
        </KbShell>
    );
}

function EmptyState({ title, body, action, onAction }: { title: string; body: string; action: string; onAction(): void }) {
    return (
        <div style={{ padding: '48px 24px', textAlign: 'center', border: '1px dashed var(--border2)', borderRadius: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{title}</div>
            <div style={{ fontSize: 12.5, color: 'var(--fg3)', marginBottom: 14 }}>{body}</div>
            <Button variant="secondary" onClick={onAction}>{action}</Button>
        </div>
    );
}
