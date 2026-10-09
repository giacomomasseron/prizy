import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { KbShell } from './KbShell';
import { KbHeader } from './KbHeader';
import { StatusPill } from './StatusPill';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { FIELD_CLASSES, Input, TITLE_FIELD_CLASSES, titleFieldEdge } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';
import { ApiError } from '../../lib/apiClient';
import { KbTranslationCard } from './KbTranslationCard';
import { KbTranslationDrawer } from './KbTranslationDrawer';
import { KbVersionCard } from './KbVersionCard';
import { KbVersionDrawer } from './KbVersionDrawer';
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
import { FIELD_SHELL_CLASSES, dangerCard, fieldShell, kbCard, kbLabel } from './kbStyles';
import { DANGER_PILL_CLASSES, PILL_CLASSES, fieldLabel, pillBtn, selectStyle } from '../settings/settingsStyles';
import type { KbArticleEdit, KbCategoryNode, KbStatus } from './types';

type Tab = 'write' | 'preview';

const STATUS_HINT: Record<KbStatus, string> = {
    draft: 'Only agents can see this. Publishing puts it on the customer help center.',
    published: 'Live on the help center and returned by customer search.',
    archived: 'Hidden from customers and from search. Its URL redirects to the category.',
};

const EDITOR_SUB = 'Authoring · publishes to the customer help center';
const cardColumn: CSSProperties = { ...kbCard, display: 'flex', flexDirection: 'column', gap: 12 };

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
                <KbHeader title="Knowledge base" subtitle={EDITOR_SUB} />
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
    const slugInputRef = useRef<HTMLInputElement>(null);
    const [dirty, setDirty] = useState(false);
    const [savedMsg, setSavedMsg] = useState(isNew ? 'Not saved yet' : justCreated ? 'Saved just now' : 'All changes saved');
    const [saveError, setSaveError] = useState<string | null>(null);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    // Drives the version-history drawer below: KbVersionCard's onOpen callback writes here, and
    // KbVersionDrawer reads it.
    const [versionDrawer, setVersionDrawer] = useState<{ open: boolean; versionId: string | null }>({ open: false, versionId: null });
    // Drives the translations drawer (Task 8): KbTranslationCard's onOpen callback writes here.
    const [translationDrawer, setTranslationDrawer] = useState<{ open: boolean; locale: string | null }>({ open: false, locale: null });

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

    // Extracted so KbVersionDrawer's restore flow can save the live draft (title/body/section)
    // before restoring an older version — reused as-is by onSave() below for the existing-article
    // path, so both callers persist identically. Unlike onSave(), this does NOT swallow a
    // rejection: the drawer's own try/catch needs to see the failure to abort the restore and
    // show it inline, rather than treating a failed save as though it had succeeded.
    async function persist(): Promise<void> {
        if (!id) return;
        await updateArticle.mutateAsync({ id, title, slug, body, section_id: sectionId });
        setDirty(false);
        setSavedMsg('Saved just now');
    }

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
                await persist();
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <KbHeader title={isNew ? 'New article' : title.trim() || 'Untitled article'} subtitle={EDITOR_SUB} />

            <div data-testid="kb-editor-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, padding: '22px 26px 40px', alignItems: 'flex-start' }}>
                    <div style={{ flex: '1 1 520px', minWidth: 0 }}>
                        <button
                            type="button"
                            onClick={() => navigate('/support/kb')}
                            className="text-fg3 hover:text-fg"
                            style={{ border: 'none', background: 'none', padding: 0, marginBottom: 14, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                            ‹ Library
                        </button>

                        {/* A bare input, not the pill Input: the title field has no edge at rest (V2-G3b). */}
                        <input
                            aria-label="Article title"
                            placeholder="Article title"
                            value={title}
                            onChange={(e) => onTitleChange(e.target.value)}
                            className={TITLE_FIELD_CLASSES}
                            style={{ ...titleFieldEdge, width: '100%', boxSizing: 'border-box', outline: 'none', color: 'var(--fg)', background: 'transparent', padding: 0, borderRadius: 0, fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1.15 }}
                        />

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
                            <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                                <label htmlFor="kb-article-slug" style={fieldLabel}>URL slug</label>
                                <div
                                    data-testid="kb-slug-shell"
                                    className={FIELD_SHELL_CLASSES}
                                    style={fieldShell}
                                    // A click on the /help/…/ prefix focuses the input, like a click on any field.
                                    onMouseDown={(e) => { if (e.target !== slugInputRef.current) { e.preventDefault(); slugInputRef.current?.focus(); } }}
                                >
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1, minWidth: 0 }}>
                                        /help/{selectedCategory?.slug ?? '…'}/{selectedSection?.slug ?? '…'}/
                                    </span>
                                    <input
                                        ref={slugInputRef}
                                        id="kb-article-slug"
                                        placeholder="article-slug"
                                        value={slug}
                                        onChange={(e) => onSlugChange(e.target.value)}
                                        style={{ flex: 1, minWidth: 60, border: 'none', background: 'none', outline: 'none', padding: 0, color: 'var(--fg)', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}
                                    />
                                </div>
                                <div style={{ marginTop: 7, fontSize: 11.5, fontFamily: 'var(--font-mono)', color: taken ? 'var(--red-ink)' : 'var(--fg3)' }}>{slugNote}</div>
                            </div>

                            <div style={{ flex: '0 1 260px', minWidth: 200 }}>
                                <label htmlFor="kb-article-section" style={fieldLabel}>Section</label>
                                {noSections ? (
                                    <div role="alert" style={{ fontSize: 12, color: 'var(--red-ink)' }}>
                                        No sections exist yet — create one in the library before writing this article.
                                    </div>
                                ) : (
                                    <select id="kb-article-section" aria-label="Section" value={sectionId} onChange={(e) => onSectionChange(e.target.value)} className={FIELD_CLASSES} style={{ ...selectStyle, width: '100%', fontSize: 13 }}>
                                        {allSections.map((s) => (
                                            <option key={s.id} value={s.id}>{s.categoryName} › {s.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
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
                                aria-label="Article body"
                                value={body}
                                onChange={(e) => onBodyChange(e.target.value)}
                                placeholder={'# Heading\n\nWrite the article in markdown. Use ## for sections, - for bullets, **bold** and `code`.'}
                                style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.7, minHeight: 460, resize: 'vertical', marginTop: 10, padding: '16px 18px' }}
                            />
                        ) : (
                            <div style={{ marginTop: 10, border: 'var(--line) solid var(--border2)', borderRadius: 'var(--radius-card)', background: 'var(--panel)', padding: '26px 30px', minHeight: 460, boxSizing: 'border-box' }}>
                                <div style={kbLabel}>As customers see it</div>
                                <h1 style={{ margin: '10px 0 8px', fontSize: 24, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.25 }}>{title || 'Untitled article'}</h1>
                                <div style={{ fontSize: 11.5, color: 'var(--fg3)', marginBottom: 22 }}>{previewMeta}</div>
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

                    <aside aria-label="Article settings" style={{ flex: '0 1 296px', minWidth: 264, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={cardColumn}>
                            <div style={kbLabel}>Status</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                <StatusPill status={status} />
                                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg3)' }}>{isNew ? '—' : shortRef(id ?? '')}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'var(--fg2)' }}>{STATUS_HINT[status]}</p>
                            <Button
                                variant={status === 'published' ? 'secondary' : 'primary'}
                                onClick={() => runStatus(status === 'published' ? 'draft' : 'published')}
                                disabled={!title.trim() || !body.trim() || noSections || pending}
                                style={{ width: '100%' }}
                            >
                                {status === 'published' ? 'Unpublish' : 'Publish'}
                            </Button>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Button variant="secondary" size="sm" onClick={() => runStatus(status === 'archived' ? 'draft' : 'archived')} disabled={(isNew && noSections) || pending} style={{ flex: 1 }}>
                                    {status === 'archived' ? 'Restore' : 'Archive'}
                                </Button>
                                {status === 'published' && article?.public_url && (
                                    <a href={article.public_url} target="_blank" rel="noreferrer" className={PILL_CLASSES} style={{ ...pillBtn, flex: 1, justifyContent: 'center', textDecoration: 'none' }}>Open ↗</a>
                                )}
                            </div>
                            {statusError && <div role="alert" style={{ color: 'var(--red-ink)', fontSize: 12 }}>{statusError}</div>}
                        </div>

                        <div style={cardColumn}>
                            <div style={kbLabel}>Details</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                <Avatar {...avatarFor(article?.author ?? null)} size={30} />
                                <span style={{ fontSize: 13, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{article?.author?.name ?? '—'}</span>
                            </div>
                            <div style={{ height: 1, background: 'var(--border)' }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <DetailRow label="Created" value={formatDate(article?.created_at ?? null)} />
                                <DetailRow label="Published" value={formatDate(article?.published_at ?? null)} />
                                <DetailRow label="Updated" value={formatDate(article?.updated_at ?? null)} />
                                <DetailRow label="Category" value={selectedCategory?.slug ?? '—'} />
                            </div>
                        </div>

                        {!isNew && id && (
                            <KbTranslationCard articleId={id} onOpen={(locale) => setTranslationDrawer({ open: true, locale: locale ?? null })} />
                        )}

                        {!isNew && id && (
                            <KbVersionCard articleId={id} onOpen={(versionId) => setVersionDrawer({ open: true, versionId: versionId ?? null })} />
                        )}

                        <div style={kbCard}>
                            <div style={{ ...kbLabel, marginBottom: 12 }}>Performance</div>
                            <div style={{ display: 'flex', gap: 14 }}>
                                <Stat value={formatViews(article?.views_count ?? 0)} label="views" color="var(--fg)" />
                                <Stat value={formatViews(article?.helpful_count ?? 0)} label="👍 helpful" color="var(--green)" />
                                <Stat value={formatViews(article?.unhelpful_count ?? 0)} label="👎 not helpful" color="var(--fg2)" />
                            </div>
                        </div>

                        {!isNew && (
                            <div data-testid="kb-danger-zone" style={dangerCard}>
                                <div style={{ ...kbLabel, marginBottom: 6 }}>Danger zone</div>
                                <p style={{ margin: '0 0 11px', fontSize: 12, lineHeight: 1.5, color: 'var(--fg2)' }}>Deleting removes the article and its URL. Customers with the link will get a 404.</p>
                                <button type="button" onClick={onDelete} disabled={deleteArticle.isPending} className={DANGER_PILL_CLASSES} style={pillBtn}>Delete article</button>
                                {deleteError && <div role="alert" style={{ color: 'var(--red-ink)', fontSize: 12, marginTop: 8 }}>{deleteError}</div>}
                            </div>
                        )}
                    </aside>
                </div>

                {!isNew && id && (
                    <KbVersionDrawer
                        articleId={id}
                        open={versionDrawer.open}
                        initialVersionId={versionDrawer.versionId}
                        dirty={dirty}
                        onClose={() => setVersionDrawer({ open: false, versionId: null })}
                        onRestored={(msg, restoredArticle) => {
                            setSavedMsg(msg);
                            setDirty(false);
                            // Review round 1, Finding 1 (Critical): the keyed remount (`key={article?.id
                            // ?? 'new'}` above) only fires when the article's id changes, which a restore
                            // never does — so without this, the title/body inputs kept showing the
                            // pre-restore text even though the confirmation said otherwise. Apply the
                            // restored values to the state that's already here instead.
                            setTitle(restoredArticle.title);
                            setBody(restoredArticle.body);
                        }}
                        onSaveFirst={persist}
                    />
                )}

                {!isNew && id && (
                    <KbTranslationDrawer
                        articleId={id}
                        open={translationDrawer.open}
                        initialLocale={translationDrawer.locale}
                        articleStatus={article?.status ?? 'draft'}
                        onClose={() => setTranslationDrawer({ open: false, locale: null })}
                        onViewChanges={() => setVersionDrawer({ open: true, versionId: null })}
                    />
                )}
            </div>

            <div data-testid="kb-editor-footer" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '11px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg2)' }}>
                <span style={{ fontSize: 12, color: 'var(--fg3)' }}>{savedMsg}</span>
                <div style={{ flex: 1 }} />
                {saveError && <span role="alert" style={{ color: 'var(--red-ink)', fontSize: 12 }}>{saveError}</span>}
                <Button variant="secondary" size="sm" onClick={() => navigate('/support/kb')}>Close</Button>
                {canSave ? (
                    <Button size="sm" onClick={onSave} disabled={pending}>Save changes</Button>
                ) : (
                    <Button size="sm" disabled>Saved</Button>
                )}
            </div>
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 12 }}>
            <span style={{ width: 78, flexShrink: 0, color: 'var(--fg3)' }}>{label}</span>
            <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg)', overflowWrap: 'anywhere' }}>{value}</span>
        </div>
    );
}

// 19px bold mono counts as large text, so the green "helpful" figure passes at 4.0:1.
function Stat({ value, label, color }: { value: string; label: string; color: string }) {
    return (
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 19, fontWeight: 700, lineHeight: 1, color }}>{value}</div>
            <div style={{ marginTop: 5, fontSize: 11, color: 'var(--fg3)' }}>{label}</div>
        </div>
    );
}
