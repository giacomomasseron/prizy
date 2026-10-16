import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KbShell } from './KbShell';
import { KbHeader } from './KbHeader';
import { KbTree, type TreeNode } from './KbTree';
import { KbArticleTable } from './KbArticleTable';
import { KbNodeModal, type NodeModalState } from './KbNodeModal';
import { useKbLibrary } from './hooks';
import { crumbStyle, leadStyle, pageTitle } from './kbStyles';
import type { KbStatus } from './types';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { QueryState } from '../../components/ui/QueryState';
import { useMe } from '../../auth/useAuth';
import { canWriteHelpdesk } from '../../auth/capabilities';

type Filter = 'all' | KbStatus;

function plural(n: number, one: string, many: string): string {
    return `${n} ${n === 1 ? one : many}`;
}

export default function KbLibraryPage() {
    const lib = useKbLibrary();
    const canWrite = canWriteHelpdesk(useMe().data); // a viewer browses and reads, writes nothing
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
    const allArticles = categories.flatMap((c) => c.sections.flatMap((s) => s.articles));
    const totalArticles = allArticles.length;
    const liveArticles = allArticles.filter((a) => a.status === 'published').length;
    const subtitle = lib.isSuccess
        ? `${plural(totalArticles, 'article', 'articles')} · ${liveArticles} live · ${plural(categories.length, 'category', 'categories')}`
        : '';
    const newArticleSection = node.kind === 'section' ? node.id : node.kind === 'category' ? categories.find((c) => c.id === node.id)?.sections[0]?.id : categories[0]?.sections[0]?.id;
    const newArticle = () => navigate(newArticleSection ? `/support/kb/new?section=${newArticleSection}` : '/support/kb/new');

    return (
        <KbShell>
            <KbHeader title="Knowledge base" subtitle={subtitle} />
            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
                <KbTree categories={categories} node={node} onSelect={setNode} totalArticles={totalArticles} onOpenModal={setModal} readOnly={!canWrite} />
                <section style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div style={{ flexShrink: 0, padding: '16px 22px 14px', borderBottom: '1px solid var(--border)' }}>
                        <div style={crumbStyle}>{scope.crumb}</div>
                        <h1 style={pageTitle}><span className="hl">{scope.title}</span></h1>
                        <p style={leadStyle}>{scope.description}</p>
                        {lib.isSuccess && categories.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                                <SegmentedControl<Filter> value={filter} onChange={setFilter} options={[
                                    { value: 'all', label: `All ${counts.all}` }, { value: 'draft', label: `Draft ${counts.draft}` },
                                    { value: 'published', label: `Published ${counts.published}` }, { value: 'archived', label: `Archived ${counts.archived}` },
                                ]} />
                                <Input aria-label="Search titles" placeholder="Search titles" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 240, padding: '7px 14px', fontSize: 13 }} />
                                <div style={{ flex: 1 }} />
                                {canWrite && <Button size="sm" onClick={newArticle}>＋ New article</Button>}
                            </div>
                        )}
                    </div>
                    <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                        <QueryState query={lib} what="the library" frame={{ padding: '28px 22px' }}>
                            {categories.length === 0 ? (
                                <EmptyState title="No categories yet" body="Categories are the top-level topics customers browse on the help center." action={canWrite ? { label: '＋ First category', run: () => setModal({ kind: 'category' }) } : undefined} />
                            ) : visible.length === 0 ? (
                                filtered
                                    ? <EmptyState title="Nothing matches those filters" body="Clear the search or switch the status filter to see everything in this section." action={canWrite ? { label: '＋ New article here', run: newArticle } : undefined} />
                                    : <EmptyState title="No articles in here yet" body={canWrite ? 'Write the first one — it stays a draft until you publish it.' : 'Nothing has been written in here yet.'} action={canWrite ? { label: '＋ New article here', run: newArticle } : undefined} />
                            ) : (
                                <KbArticleTable articles={visible} canReorder={node.kind === 'section' && !filtered} readOnly={!canWrite} />
                            )}
                        </QueryState>
                    </div>
                </section>
            </div>
            {canWrite && <KbNodeModal state={modal} categories={categories} onClose={() => setModal(null)} onCreated={(n) => setNode(n)} />}
        </KbShell>
    );
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: { label: string; run(): void } }) {
    return (
        <div data-testid="kb-empty" style={{ margin: '28px 22px', padding: '44px 24px', textAlign: 'center', border: 'var(--line) dashed var(--border2)', borderRadius: 'var(--radius-card)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', marginBottom: 6 }}>{title}</div>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--fg3)', marginBottom: action ? 16 : 0 }}>{body}</div>
            {action && <Button variant="secondary" size="sm" onClick={action.run}>{action.label}</Button>}
        </div>
    );
}
