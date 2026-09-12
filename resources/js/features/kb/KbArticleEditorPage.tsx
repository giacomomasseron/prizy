import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { KbShell } from './KbShell';
import { StatusPill } from './StatusPill';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';
import { ApiError } from '../../lib/apiClient';
import { KbVersionCard } from './KbVersionCard';
import {
    useChangeKbArticleStatus,
    useCreateKbArticle,
    useDeleteKbArticle,
    useKbArticle,
    useKbLibrary,
    usePreviewKbMarkdown,
    useUpdateKbArticle,
} from './hooks';
import { formatDate, formatViews, shortRef, slugify, wordStats } from './kbUtils';
import type { KbArticleEdit, KbCategoryNode, KbStatus } from './types';

type Tab = 'write' | 'preview';

const STATUS_HINT: Record<KbStatus, string> = {
    draft: 'Only agents can see this. Publishing puts it on the customer help center.',
    published: 'Live on the help center and returned by customer search.',
    archived: 'Hidden from customers and from search. Its URL redirects to the category.',
};

const card: CSSProperties = { border: '1px solid var(--border)', borderRadius: 10, padding: 14 };
const cardTitle: CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '.05em' };
const fieldLabel: CSSProperties = { fontSize: 12, color: 'var(--fg3)', display: 'block', marginBottom: 6 };

export default function KbArticleEditorPage() {
    const { id } = useParams();
    const isNew = !id;
    const [searchParams] = useSearchParams();

    const articleQuery = useKbArticle(id);
    const article = articleQuery.data;
    const lib = useKbLibrary();
    const categories = lib.data?.categories ?? [];

    // Set by EditorForm right before it creates a brand-new article and navigates to its
    // permanent URL. That navigation changes the `id` route param, which makes useKbArticle(id)
    // a cache miss — the loading gate below then remounts EditorForm (fresh local state, see its
    // `key`) once the article has loaded. This id lives on THIS outer component specifically
    // because it survives that remount (only the keyed EditorForm below is torn down), so the
    // freshly-mounted form can seed its "Saved just now" message instead of losing it — without
    // restructuring the loading-gate/remount pattern itself.
    const [justSavedId, setJustSavedId] = useState<string | null>(null);

    // Existing article: hold off on mounting the form until it has actually loaded, so the form's
    // local state (see EditorForm) can seed itself synchronously from real data on its first render
    // instead of racing an effect (a naive effect-based reseed leaves one render where inputs are
    // visible but still empty — observable, and wrong).
    if (!isNew && !article) {
        return (
            <KbShell>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg3)', fontSize: 13 }}>
                    {articleQuery.isError ? 'This article could not be found.' : 'Loading…'}
                </div>
            </KbShell>
        );
    }

    return (
        <KbShell>
            {/* key remounts the form (fresh local state) whenever the underlying article identity changes */}
            <EditorForm
                key={article?.id ?? 'new'}
                id={id}
                isNew={isNew}
                article={article}
                categories={categories}
                initialSection={searchParams.get('section') ?? ''}
                justCreated={!!article && article.id === justSavedId}
                onCreated={setJustSavedId}
            />
        </KbShell>
    );
}

interface EditorFormProps {
    id: string | undefined;
    isNew: boolean;
    article: KbArticleEdit | undefined;
    categories: KbCategoryNode[];
    initialSection: string;
    justCreated: boolean;
    onCreated(id: string): void;
}

function EditorForm({ id, isNew, article, categories, initialSection, justCreated, onCreated }: EditorFormProps) {
    const navigate = useNavigate();
    const confirm = useConfirm();

    const createArticle = useCreateKbArticle();
    const updateArticle = useUpdateKbArticle();
    const deleteArticle = useDeleteKbArticle();
    const changeStatus = useChangeKbArticleStatus();
    const preview = usePreviewKbMarkdown();

    const [title, setTitle] = useState(article?.title ?? '');
    const [slug, setSlug] = useState(article?.slug ?? '');
    const [slugTouched, setSlugTouched] = useState(false);
    const [sectionId, setSectionId] = useState(article?.section_id ?? initialSection ?? categories.flatMap((c) => c.sections)[0]?.id ?? '');
    const [body, setBody] = useState(article?.body ?? '');
    const [tab, setTab] = useState<Tab>('write');
    const [dirty, setDirty] = useState(false);
    const [savedMsg, setSavedMsg] = useState(isNew ? 'Not saved yet' : justCreated ? 'Saved just now' : 'All changes saved');
    const [saveError, setSaveError] = useState<string | null>(null);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    // Task 6 renders the version-history drawer from this state; for now the setter only needs to
    // exist so KbVersionCard's onOpen callback has somewhere to write.
    const [versionDrawer, setVersionDrawer] = useState<{ open: boolean; versionId: string | null }>({ open: false, versionId: null });

    // A brand-new article opened with no ?section= falls back to the first section anywhere in the
    // library (flattened across all categories, in library order) once it loads — not just the first
    // category's first section, since a leading category can have zero sections (as this feature's own
    // fixtures already model). Guarded on sectionId still being empty so it never clobbers a selection
    // already in place.
    useEffect(() => {
        if (isNew && !sectionId && categories.length > 0) {
            setSectionId(categories.flatMap((c) => c.sections)[0]?.id ?? '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isNew, categories.length]);

    const [debouncedBody, setDebouncedBody] = useState(body);
    useEffect(() => {
        const t = setTimeout(() => setDebouncedBody(body), 400);
        return () => clearTimeout(t);
    }, [body]);
    useEffect(() => {
        if (tab === 'preview') preview.mutate(debouncedBody);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, debouncedBody]);

    function markDirty() {
        setDirty(true);
        setSavedMsg('Unsaved changes');
    }

    function onTitleChange(v: string) {
        setTitle(v);
        if (isNew && !slugTouched) setSlug(slugify(v));
        markDirty();
    }
    function onSlugChange(v: string) {
        // Deliberately NOT run through slugify() per keystroke: this field's own previous value would
        // otherwise feed back into itself (a trailing "-" gets stripped mid-typing, corrupting the next
        // character position). Title→slug derivation above is safe because it recomputes from the full,
        // untouched `title` value every time rather than from slug's own prior state.
        setSlug(v);
        setSlugTouched(true);
        markDirty();
    }
    function onSectionChange(v: string) {
        setSectionId(v);
        markDirty();
    }
    function onBodyChange(v: string) {
        setBody(v);
        markDirty();
    }

    const allSections = useMemo(
        () => categories.flatMap((c) => c.sections.map((s) => ({ ...s, categoryName: c.name, categorySlug: c.slug }))),
        [categories],
    );
    const selectedSection = allSections.find((s) => s.id === sectionId);
    const selectedCategory = categories.find((c) => c.id === selectedSection?.category_id);

    const taken = !!selectedSection && selectedSection.articles.some((a) => a.slug === slug && a.id !== id);
    const slugNote = !slug
        ? 'The slug is generated from the title — edit it before publishing.'
        : taken
            ? '✗ already used in this section'
            : '✓ available';

    const stats = wordStats(body);
    const status: KbStatus = article?.status ?? 'draft';
    const pending = createArticle.isPending || updateArticle.isPending || changeStatus.isPending;
    const noSections = allSections.length === 0;
    const canSave = dirty && title.trim() !== '' && slug !== '' && !taken && !noSections;

    async function onSave() {
        setSaveError(null);
        try {
            if (isNew) {
                const res = await createArticle.mutateAsync({ section_id: sectionId, title, slug, body });
                setDirty(false);
                // Not setSavedMsg here: this EditorForm instance is about to unmount (the
                // navigate below changes the route param, and the loading gate in the parent
                // remounts EditorForm once the article loads under its new key) — a local
                // setSavedMsg would just be discarded. onCreated hands the id to the parent,
                // which survives the remount and re-seeds the fresh instance's initial state
                // with "Saved just now" instead.
                onCreated(res.id);
                navigate(`/support/kb/articles/${res.id}`, { replace: true });
            } else if (id) {
                await updateArticle.mutateAsync({ id, title, slug, body, section_id: sectionId });
                setDirty(false);
                setSavedMsg('Saved just now');
            }
        } catch (err) {
            if (err instanceof ApiError) {
                setSaveError(err.errors?.slug?.[0] ?? err.errors?.section_id?.[0] ?? err.detail);
            } else {
                setSaveError('Failed to save the article.');
            }
        }
    }

    async function runStatus(next: KbStatus) {
        setStatusError(null);
        let targetId = id;
        if (isNew) {
            try {
                const res = await createArticle.mutateAsync({ section_id: sectionId, title, slug, body });
                targetId = res.id;
            } catch (err) {
                setStatusError(err instanceof ApiError ? err.detail : 'Failed to create the article.');
                return;
            }
        }
        if (!targetId) return;
        try {
            await changeStatus.mutateAsync({ id: targetId, status: next });
        } catch (err) {
            setStatusError(err instanceof ApiError ? err.detail : 'Failed to update the article status.');
            return;
        }
        // Navigate only after BOTH the create and the status change have succeeded — navigating any
        // earlier would unmount this component while a still-pending mutation's rejection is in
        // flight, silently dropping the error it would otherwise have surfaced above.
        if (isNew) {
            setDirty(false);
            // Same reasoning as onSave(): this instance unmounts on navigate, so hand the id
            // to the parent instead of setting local state that would just be discarded.
            onCreated(targetId);
            navigate(`/support/kb/articles/${targetId}`, { replace: true });
        }
    }

    async function onDelete() {
        if (!id) return;
        const ok = await confirm({
            title: 'Delete this article?',
            message: 'Deleting removes the article and its URL. Customers with the link will get a 404.',
            confirmLabel: 'Delete article',
            cancelLabel: 'Keep it',
            danger: true,
        });
        if (!ok) return;
        setDeleteError(null);
        try {
            await deleteArticle.mutateAsync(id);
            navigate('/support/kb');
        } catch (err) {
            setDeleteError(err instanceof ApiError ? err.detail : 'Failed to delete the article.');
        }
    }

    const previewMeta = selectedCategory && selectedSection
        ? `${selectedCategory.name} › ${selectedSection.name} · updated ${formatDate(article?.updated_at ?? null)}`
        : 'Unfiled';

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <Button variant="ghost" onClick={() => navigate('/support/kb')}>‹ Library</Button>
            </div>

            <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 28, padding: '20px 24px' }}>
                <div style={{ flex: '1 1 520px', minWidth: 0 }}>
                    <Input
                        placeholder="Article title"
                        value={title}
                        onChange={(e) => onTitleChange(e.target.value)}
                        style={{ border: 'none', background: 'transparent', fontSize: 26, fontWeight: 600, padding: '4px 0' }}
                    />

                    <div style={{ marginTop: 14 }}>
                        <label htmlFor="kb-article-slug" style={fieldLabel}>URL slug</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg3)', whiteSpace: 'nowrap' }}>
                                /help/{selectedCategory?.slug ?? '…'}/{selectedSection?.slug ?? '…'}/
                            </span>
                            <Input id="kb-article-slug" placeholder="article-slug" value={slug} onChange={(e) => onSlugChange(e.target.value)} style={{ maxWidth: 260 }} />
                        </div>
                        <div style={{ fontSize: 11.5, color: taken ? 'var(--red)' : 'var(--fg3)', marginTop: 4 }}>{slugNote}</div>
                    </div>

                    <div style={{ marginTop: 16 }}>
                        <label htmlFor="kb-article-section" style={fieldLabel}>Section</label>
                        {noSections ? (
                            <div role="alert" style={{ fontSize: 12, color: 'var(--red)' }}>
                                No sections exist yet — create one in the library before writing this article.
                            </div>
                        ) : (
                            <select id="kb-article-section" aria-label="Section" value={sectionId} onChange={(e) => onSectionChange(e.target.value)}>
                                {allSections.map((s) => (
                                    <option key={s.id} value={s.id}>{s.categoryName} › {s.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
                        <SegmentedControl<Tab>
                            value={tab}
                            onChange={setTab}
                            options={[{ value: 'write', label: 'Write' }, { value: 'preview', label: 'Preview' }]}
                        />
                        <span style={{ fontSize: 11.5, color: 'var(--fg3)' }}>
                            {stats.words === 0 ? 'empty' : `${stats.words} words · ${stats.minutes} min read`}
                        </span>
                    </div>

                    {tab === 'write' ? (
                        <Textarea
                            value={body}
                            onChange={(e) => onBodyChange(e.target.value)}
                            placeholder={'# Heading\n\nWrite the article in markdown. Use ## for sections, - for bullets, **bold** and `code`.'}
                            style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.7, minHeight: 460, resize: 'vertical', marginTop: 10 }}
                        />
                    ) : (
                        <div style={{ marginTop: 10, border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
                            <div style={{ fontSize: 11, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>As customers see it</div>
                            <h1 style={{ fontSize: 22, fontWeight: 700, margin: '8px 0 4px' }}>{title || 'Untitled article'}</h1>
                            <div style={{ fontSize: 12, color: 'var(--fg3)', marginBottom: 16 }}>{previewMeta}</div>
                            {body.trim() === '' ? (
                                <p style={{ fontStyle: 'italic', color: 'var(--fg3)' }}>Nothing written yet — switch to Write and start the article.</p>
                            ) : (
                                // Safe: this HTML comes ONLY from the POST /v1/kb/preview response (never concatenated
                                // with local state, never built client-side), rendered server-side by
                                // App\Services\MarkdownRenderer (html_input=>'escape', allow_unsafe_links=>false) — the
                                // same renderer whose output the public help-center article page already trusts via
                                // Blade {!! !!}. SearchPage.tsx's "never dangerouslySetInnerHTML" rule guards a
                                // DIFFERENT situation (an unsanitized search query interpolated into text with no
                                // renderer anywhere in the path); here the string is always pre-escaped server-side
                                // before it ever reaches the client, so that rule does not apply.
                                <div className="kb-preview" dangerouslySetInnerHTML={{ __html: preview.data?.html ?? '' }} />
                            )}
                        </div>
                    )}
                </div>

                <aside style={{ flex: '0 1 296px', minWidth: 264, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={card}>
                        <div style={cardTitle}>Status</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                            <StatusPill status={status} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg3)' }}>{isNew ? '—' : shortRef(id ?? '')}</span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--fg3)', marginTop: 8 }}>{STATUS_HINT[status]}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                            <Button
                                onClick={() => runStatus(status === 'published' ? 'draft' : 'published')}
                                disabled={!title.trim() || !body.trim() || noSections || pending}
                            >
                                {status === 'published' ? 'Unpublish' : 'Publish'}
                            </Button>
                            <Button variant="secondary" onClick={() => runStatus(status === 'archived' ? 'draft' : 'archived')} disabled={(isNew && noSections) || pending}>
                                {status === 'archived' ? 'Restore' : 'Archive'}
                            </Button>
                            {status === 'published' && article?.public_url && (
                                <a href={article.public_url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: 'var(--fg2)', textAlign: 'center' }}>Open ↗</a>
                            )}
                        </div>
                        {statusError && <div role="alert" style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{statusError}</div>}
                    </div>

                    <div style={card}>
                        <div style={cardTitle}>Details</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                            <Avatar {...avatarFor(article?.author ?? null)} size={20} />
                            <span style={{ fontSize: 12.5 }}>{article?.author?.name ?? '—'}</span>
                        </div>
                        <DetailRow label="Created" value={formatDate(article?.created_at ?? null)} />
                        <DetailRow label="Published" value={formatDate(article?.published_at ?? null)} />
                        <DetailRow label="Updated" value={formatDate(article?.updated_at ?? null)} />
                        <DetailRow label="Category" value={selectedCategory?.slug ?? '—'} />
                    </div>

                    {!isNew && id && (
                        <KbVersionCard articleId={id} onOpen={(versionId) => setVersionDrawer({ open: true, versionId: versionId ?? null })} />
                    )}

                    <div style={card}>
                        <div style={cardTitle}>Performance</div>
                        <DetailRow label="views" value={formatViews(article?.views_count ?? 0)} />
                        <DetailRow label="👍 helpful" value={formatViews(article?.helpful_count ?? 0)} />
                        <DetailRow label="👎 not helpful" value={formatViews(article?.unhelpful_count ?? 0)} />
                    </div>

                    {!isNew && (
                        <div style={card}>
                            <div style={cardTitle}>Danger zone</div>
                            <p style={{ fontSize: 12, color: 'var(--fg3)', marginTop: 8 }}>Deleting removes the article and its URL. Customers with the link will get a 404.</p>
                            <Button variant="secondary" onClick={onDelete} style={{ color: 'var(--red)', borderColor: 'var(--red)', marginTop: 8 }}>Delete article</Button>
                            {deleteError && <div role="alert" style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{deleteError}</div>}
                        </div>
                    )}
                </aside>
            </div>

            <div style={{ position: 'sticky', bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 24px', borderTop: '1px solid var(--border)', background: 'var(--panel)', flexShrink: 0 }}>
                <span style={{ fontSize: 12.5, color: 'var(--fg3)' }}>{savedMsg}</span>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {saveError && <span role="alert" style={{ color: 'var(--red)', fontSize: 12 }}>{saveError}</span>}
                    <Button variant="secondary" onClick={() => navigate('/support/kb')}>Close</Button>
                    {canSave ? (
                        <Button onClick={onSave}>Save changes</Button>
                    ) : (
                        <Button disabled>Saved</Button>
                    )}
                </div>
            </div>
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 8 }}>
            <span style={{ color: 'var(--fg3)' }}>{label}</span>
            <span>{value}</span>
        </div>
    );
}
