import { useEffect, useState, type CSSProperties } from 'react';
import { Button } from '../../components/ui/Button';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { Drawer } from '../../components/ui/Drawer';
import { IconButton } from '../../components/ui/IconButton';
import { Input } from '../../components/ui/Input';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Textarea } from '../../components/ui/Textarea';
import { ApiError } from '../../lib/apiClient';
import {
    useChangeKbTranslationStatus,
    useDeleteKbTranslation,
    useKbArticle,
    useKbArticleTranslations,
    useKbTranslation,
    usePreviewKbMarkdown,
    useUpsertKbTranslation,
} from './hooks';
import { formatDate } from './kbUtils';
import { drawerFooter, drawerHeader, drawerList, drawerSub, kbLabel, notTranslatedPill, pickRow, pickRowClasses, sourceTag, staleDot } from './kbStyles';
import { StatusPill } from './StatusPill';
import { modalTitle } from '../settings/settingsStyles';
import type { KbArticleEdit, KbStatus, KbTranslationSummary } from './types';

type Tab = 'write' | 'preview';

export interface KbTranslationDrawerProps {
    articleId: string;
    open: boolean;
    initialLocale: string | null;
    articleStatus: KbStatus;
    onClose(): void;
    // The stale banner's "View what changed" hands off to the OTHER drawer the editor owns —
    // this component never reaches across to open it directly.
    onViewChanges(): void;
    /** A viewer reads the translations: nothing to start, save, publish or delete. */
    readOnly?: boolean;
}

const sourceH2: CSSProperties = { margin: '0 0 10px', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, letterSpacing: '-.025em', color: 'var(--fg)' };

export function KbTranslationDrawer({ articleId, open, initialLocale, articleStatus, onClose, onViewChanges, readOnly = false }: KbTranslationDrawerProps) {
    const articleQuery = useKbArticle(articleId);
    const article = articleQuery.data;
    const translationsQuery = useKbArticleTranslations(articleId);
    // Defensive, matching KbTranslationCard's convention: an unexpected payload shape falls back
    // to an empty list rather than crashing the drawer.
    const rows = Array.isArray(translationsQuery.data) ? translationsQuery.data : [];

    const [locale, setLocale] = useState<string | null>(initialLocale);

    // Re-seed the selection every time the drawer transitions to open, mirroring
    // KbVersionDrawer — reopening it (from a different row, or from "Manage translations" with no
    // specific row) starts fresh rather than showing whatever was selected last time. English is
    // the sensible default when no row was clicked: it's always present and needs no fetch.
    useEffect(() => {
        if (open) setLocale(initialLocale ?? 'en');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Rendered once per article load, independent of which locale is selected, so both the
    // dedicated English pane and the "Compare with source" split reuse the same call instead of
    // each firing its own request against the rate-limited preview route.
    const sourcePreview = usePreviewKbMarkdown();
    useEffect(() => {
        if (article) sourcePreview.mutate(article.body);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [article?.body]);
    const sourceHtml = sourcePreview.data?.html ?? '';

    const row = rows.find((r) => r.locale === locale) ?? null;

    // Reported up by TranslationEditor (mirroring how KbVersionDrawer threads `dirty` the other
    // way, into a destructive action's own confirmation). Gates every way of abandoning an unsaved
    // draft — switching languages, closing the drawer, and handing off to the version drawer — so
    // none of them can silently discard it. The article editor has no such guard, but this
    // codebase does add one wherever it's actually been considered (KbVersionDrawer.tsx's restore
    // flow), and losing typed translation work is real data loss.
    const [editorDirty, setEditorDirty] = useState(false);
    const confirm = useConfirm();

    // Shared by every place that would otherwise discard the current draft outright: switching the
    // selected language, closing the drawer (the ✕ button, Escape, and the backdrop click all
    // route through Drawer's own `onClose`, so wrapping that one prop covers all three), and the
    // stale banner's "View what changed". One dialog, reused everywhere a draft could be
    // abandoned, rather than several similar-but-not-identical ones per trigger.
    async function confirmDiscardIfDirty(): Promise<boolean> {
        if (!editorDirty) return true;
        return confirm({
            title: 'Discard unsaved changes?',
            message: `Your unsaved edits to the ${row?.name ?? 'current'} translation will be discarded. This can't be undone.`,
            confirmLabel: 'Discard changes',
            cancelLabel: 'Keep editing',
            danger: true,
        });
    }

    async function selectLocale(next: string) {
        if (next === locale) return;
        if (!(await confirmDiscardIfDirty())) return;
        setEditorDirty(false);
        setLocale(next);
    }

    // Fires only when the editor is actually dirty — a confirmation on every close, dirty or not,
    // would be worse than the bug it prevents.
    async function handleClose() {
        if (!(await confirmDiscardIfDirty())) return;
        setEditorDirty(false);
        onClose();
    }

    // Composes the stale banner's whole action behind the same gate, rather than letting
    // TranslationEditor call onViewChanges and onClose directly: on cancel this must abort BOTH —
    // opening the version drawer while leaving this one's dirty editor open (or the reverse) would
    // be worse than the silent-loss bug the gate exists to prevent.
    async function handleViewChanges() {
        if (!(await confirmDiscardIfDirty())) return;
        setEditorDirty(false);
        onViewChanges();
        onClose();
    }

    return (
        <Drawer open={open} onClose={handleClose} side="right" width={820} label="Translations">
            <div style={drawerHeader}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={modalTitle}>Translations</h2>
                    <div style={drawerSub}>{article?.title}</div>
                </div>
                <IconButton title="Close" onClick={handleClose}>✕</IconButton>
            </div>

            <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                <div style={drawerList}>
                    {translationsQuery.isError && (
                        <div role="alert" style={{ color: 'var(--red-ink)', fontSize: 12, padding: 8 }}>
                            {translationsQuery.error instanceof ApiError ? translationsQuery.error.detail : 'Failed to load translations.'}
                        </div>
                    )}
                    {rows.map((r) => (
                        <LocaleRow key={r.locale} row={r} selected={r.locale === locale} onSelect={() => selectLocale(r.locale)} />
                    ))}
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    {locale === 'en' ? (
                        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 26px 34px' }}>
                            <div style={kbLabel}>English (source) · edited in the article editor</div>
                            {article && (
                                <>
                                    <h1 style={{ margin: '10px 0 18px', fontSize: 23, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.25 }}>{article.title}</h1>
                                    <div className="kb-preview" dangerouslySetInnerHTML={{ __html: sourceHtml }} />
                                </>
                            )}
                        </div>
                    ) : row ? (
                        <TranslationEditor
                            key={row.locale}
                            articleId={articleId}
                            row={row}
                            article={article}
                            sourceHtml={sourceHtml}
                            articleStatus={articleStatus}
                            onViewChanges={handleViewChanges}
                            onDirtyChange={setEditorDirty}
                            readOnly={readOnly}
                        />
                    ) : null}
                </div>
            </div>
        </Drawer>
    );
}

function LocaleRow({ row, selected, onSelect }: { row: KbTranslationSummary; selected: boolean; onSelect(): void }) {
    return (
        // No inline background: the selected tint and the hover both live in classes (pickRowClasses).
        <button type="button" aria-current={selected ? 'true' : undefined} onClick={onSelect} className={pickRowClasses(selected)} style={pickRow}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.6, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
                {row.stale && <span title="Source changed since this was translated" style={staleDot} />}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg3)', flexShrink: 0 }}>{row.locale}</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                {row.is_source ? (
                    <span style={sourceTag}>Source</span>
                ) : row.status === null ? (
                    <span style={notTranslatedPill}>Not translated</span>
                ) : (
                    <StatusPill status={row.status} />
                )}
                {row.is_source && <span style={{ fontSize: 11, color: 'var(--fg3)' }}>The article as written</span>}
            </span>
        </button>
    );
}

interface TranslationEditorProps {
    articleId: string;
    row: KbTranslationSummary;
    article: KbArticleEdit | undefined;
    sourceHtml: string;
    articleStatus: KbStatus;
    // Already composed by the drawer to confirm-if-dirty, then open the version drawer AND close
    // this one — never called bare, so this component has no separate onClose of its own to call
    // alongside it (see KbTranslationDrawer's handleViewChanges for why those two must not be
    // split across a cancellable confirm).
    onViewChanges(): void;
    // Reports this pane's dirty state up to the drawer, which gates every abandon path on it —
    // this component has no way to know it's about to be unmounted or navigated away from, so the
    // parent has to ask before that happens, not after.
    onDirtyChange(dirty: boolean): void;
    readOnly: boolean;
}

// Keyed by locale in the parent, so switching languages — or closing and reopening the drawer,
// which unmounts everything under Drawer — always starts this component fresh rather than
// carrying one language's unsaved draft into another's fields.
function TranslationEditor({ articleId, row, article, sourceHtml, articleStatus, onViewChanges, onDirtyChange, readOnly }: TranslationEditorProps) {
    const confirm = useConfirm();
    // Owned locally rather than read straight from `row.status`: a successful delete must flip
    // this pane back to the empty state immediately, and the parent's `rows` list is only as
    // fresh as its last fetch — invalidated in the background by useKbMutation, but not
    // guaranteed to have landed by the time this renders.
    const [exists, setExists] = useState(row.status !== null);
    const detailQuery = useKbTranslation(articleId, exists ? row.locale : null);
    const upsert = useUpsertKbTranslation();
    const changeStatus = useChangeKbTranslationStatus();
    const del = useDeleteKbTranslation();
    const preview = usePreviewKbMarkdown();

    // `original` is the baseline Save is dirty-checked against. For an existing translation it's
    // the fetched row; for one that doesn't exist on the server yet it's fixed at empty strings —
    // so seeding from "Start from English" is immediately savable (real content differs from
    // "nothing"), while "Start blank" stays not-dirty until the agent actually types something.
    const [original, setOriginal] = useState<{ title: string; body: string } | null>(null);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [status, setStatus] = useState<KbStatus | null>(null);
    const [tab, setTab] = useState<Tab>(readOnly ? 'preview' : 'write');
    const [compareOpen, setCompareOpen] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    useEffect(() => {
        if (detailQuery.data && original === null) {
            setOriginal({ title: detailQuery.data.title, body: detailQuery.data.body });
            setTitle(detailQuery.data.title);
            setBody(detailQuery.data.body);
            setDebouncedBody(detailQuery.data.body); // no stale empty-body preview on the way in
            setStatus(detailQuery.data.status);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detailQuery.data, original]);

    const [debouncedBody, setDebouncedBody] = useState(body);
    useEffect(() => {
        const t = setTimeout(() => setDebouncedBody(body), 400);
        return () => clearTimeout(t);
    }, [body]);
    // Not before the translation has loaded: a viewer opens on Preview, and rendering the
    // still-empty body would spend a call on the rate-limited preview route for nothing.
    const loaded = original !== null;
    useEffect(() => {
        if (tab === 'preview' && loaded) preview.mutate(debouncedBody);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, debouncedBody, loaded]);

    const dirty = original !== null && (title !== original.title || body !== original.body);
    useEffect(() => {
        onDirtyChange(dirty);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dirty]);

    function startFromEnglish() {
        setOriginal({ title: '', body: '' });
        setTitle(article?.title ?? '');
        setBody(article?.body ?? '');
    }
    function startBlank() {
        setOriginal({ title: '', body: '' });
        setTitle('');
        setBody('');
    }

    async function handleSave() {
        setSaveError(null);
        try {
            const saved = await upsert.mutateAsync({ articleId, locale: row.locale, title, body });
            // Apply the mutation's OWN resolved value, not the locally-typed title/body — the
            // server is the source of truth for what actually got persisted.
            setOriginal({ title: saved.title, body: saved.body });
            setTitle(saved.title);
            setBody(saved.body);
            setStatus(saved.status);
            setExists(true);
        } catch (err) {
            setSaveError(err instanceof ApiError ? err.detail : 'Failed to save this translation.');
        }
    }

    async function handleStatusChange(next: KbStatus) {
        setStatusError(null);
        try {
            const saved = await changeStatus.mutateAsync({ articleId, locale: row.locale, status: next });
            setStatus(saved.status);
        } catch (err) {
            setStatusError(err instanceof ApiError ? err.detail : 'Failed to update the status.');
        }
    }

    async function handleDelete() {
        const ok = await confirm({
            title: 'Delete this translation?',
            message: `The ${row.name} translation will be removed. Customers will see the English article instead. The English article itself is not affected.`,
            confirmLabel: 'Delete translation',
            cancelLabel: 'Keep it',
            danger: true,
        });
        if (!ok) return;
        setDeleteError(null);
        try {
            await del.mutateAsync({ articleId, locale: row.locale });
            // Back to the untranslated empty state for this locale, in place.
            setExists(false);
            setOriginal(null);
            setTitle('');
            setBody('');
            setStatus(null);
        } catch (err) {
            setDeleteError(err instanceof ApiError ? err.detail : 'Failed to delete this translation.');
        }
    }

    if (!exists && original === null) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px' }}>
                <div style={{ textAlign: 'center', maxWidth: 350 }}>
                    <p style={{ margin: '0 0 7px', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, letterSpacing: '-.025em' }}>Not translated yet</p>
                    {readOnly ? (
                        <p style={{ fontSize: 12.5, color: 'var(--fg2)', lineHeight: 1.6, margin: 0 }}>Nobody has translated this article into this language yet.</p>
                    ) : (<>
                        <p style={{ fontSize: 12.5, color: 'var(--fg2)', lineHeight: 1.6, margin: '0 0 20px' }}>
                            Start from the English article and edit it, or write this translation from scratch.
                        </p>
                        <div style={{ display: 'flex', gap: 9, justifyContent: 'center' }}>
                            <Button size="sm" onClick={startFromEnglish}>Start from English</Button>
                            <Button variant="secondary" size="sm" onClick={startBlank}>Start blank</Button>
                        </div>
                    </>)}
                </div>
            </div>
        );
    }

    // A row that DOES exist server-side, but whose content hasn't arrived yet: render nothing
    // editable rather than the write form with momentarily-empty fields. Rendering the form now
    // would race the seeding effect above — a keystroke landing in that window would be silently
    // overwritten the instant the fetch resolves. (EditorForm's own loading gate, a few files up
    // this program, exists for the identical reason.)
    if (exists && original === null) {
        return (
            <div style={{ flex: 1, padding: 20 }}>
                {detailQuery.isError ? (
                    <div role="alert" style={{ color: 'var(--red-ink)', fontSize: 12 }}>
                        {detailQuery.error instanceof ApiError ? detailQuery.error.detail : 'Failed to load this translation.'}
                    </div>
                ) : (
                    <p style={{ fontSize: 11.5, color: 'var(--fg3)' }}>Loading…</p>
                )}
            </div>
        );
    }

    const editor = tab === 'write' ? (
        <>
            <Input
                aria-label="Translated title"
                placeholder="Translated title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                readOnly={readOnly}
                style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, letterSpacing: '-.025em', marginBottom: 10 }}
            />
            <Textarea
                aria-label="Translated body"
                placeholder="Write the translation in markdown, matching the English structure."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                readOnly={readOnly}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.7, minHeight: 380 }}
            />
        </>
    ) : (
        <div style={{ border: 'var(--line) solid var(--border2)', borderRadius: 'var(--radius-card)', background: 'var(--panel)', padding: '20px 22px', minHeight: 380, boxSizing: 'border-box' }}>
            {/* Safe: this HTML comes solely from POST /kb/preview's response for THIS pane's own body —
                the same server MarkdownRenderer the article editor's own preview tab already trusts. */}
            <div className="kb-preview" dangerouslySetInnerHTML={{ __html: preview.data?.html ?? '' }} />
        </div>
    );

    return (
        <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px 28px' }}>
                {row.stale && (
                    <div data-testid="kb-stale-banner" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, padding: '12px 15px', borderRadius: 'var(--radius-row)', background: 'var(--note2)', border: 'var(--line) solid color-mix(in srgb, var(--note) 40%, transparent)' }}>
                        <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0 }} />
                        <span style={{ fontSize: 12.5, color: 'var(--fg)', lineHeight: 1.55, flex: 1 }}>
                            The English article changed on {formatDate(article?.updated_at ?? null)}, after this translation was last saved. Review it for accuracy.
                        </span>
                        <Button variant="secondary" size="sm" onClick={onViewChanges}>View what changed</Button>
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <SegmentedControl<Tab>
                        value={tab}
                        onChange={setTab}
                        options={[{ value: 'write', label: readOnly ? 'Markdown' : 'Write' }, { value: 'preview', label: 'Preview' }]}
                    />
                    <Button
                        variant={compareOpen ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setCompareOpen((v) => !v)}
                        style={{ marginLeft: 'auto' }}
                    >
                        Compare with source
                    </Button>
                </div>

                {compareOpen ? (
                    <div style={{ display: 'flex', gap: 24 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>{editor}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ ...kbLabel, marginBottom: 10 }}>English (source)</div>
                            {article && (
                                <div style={{ border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-card)', background: 'var(--bg2)', padding: '14px 16px', opacity: 0.75 }}>
                                    <h2 style={sourceH2}>{article.title}</h2>
                                    <div className="kb-preview" dangerouslySetInnerHTML={{ __html: sourceHtml }} />
                                </div>
                            )}
                        </div>
                    </div>
                ) : editor}
            </div>

            {readOnly ? (
                <div data-testid="kb-translation-footer" style={{ ...drawerFooter, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {status !== null && <StatusPill status={status} />}
                    <span style={{ fontSize: 11.5, color: 'var(--fg3)' }}>Read only: viewers cannot edit translations</span>
                </div>
            ) : (
            <div data-testid="kb-translation-footer" style={drawerFooter}>
                {deleteError && <div role="alert" style={{ color: 'var(--red-ink)', fontSize: 12, marginBottom: 8 }}>{deleteError}</div>}
                {statusError && <div role="alert" style={{ color: 'var(--red-ink)', fontSize: 12, marginBottom: 8 }}>{statusError}</div>}
                {saveError && <div role="alert" style={{ color: 'var(--red-ink)', fontSize: 12, marginBottom: 8 }}>{saveError}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={status === null}
                        className="text-fg3 enabled:hover:text-red-ink"
                        style={{ border: 'none', background: 'none', padding: 0, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap', cursor: status === null ? 'not-allowed' : 'pointer', opacity: status === null ? 0.5 : 1 }}
                    >
                        Delete translation
                    </button>
                    <span aria-hidden="true" style={{ width: 1, height: 14, background: 'var(--border2)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }} />
                    <StatusControl
                        value={status ?? 'draft'}
                        onChange={handleStatusChange}
                        disabledAll={status === null}
                        disabledPublish={articleStatus !== 'published'}
                    />
                    <Button size="sm" onClick={handleSave} disabled={!dirty || upsert.isPending}>Save translation</Button>
                </div>
                {/* Only shown when the publish rule is actually why Published is disabled — not
                    when the real reason every option is disabled is that nothing has been saved
                    yet (a brand-new draft under a draft English article would otherwise show this
                    note next to a control that's disabled for an unrelated reason). */}
                {/* The saved note sits under the row: beside the delete, status and save controls it overflowed the 514px pane. */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 8, fontSize: 11.5, color: 'var(--fg3)' }}>
                    <span>{dirty ? 'Unsaved changes' : status !== null ? 'Saved' : ''}</span>
                    {status !== null && articleStatus !== 'published' && (
                        <p style={{ margin: '0 0 0 auto' }}>Publish the English article first</p>
                    )}
                </div>
            </div>
            )}
        </>
    );
}

// A plain Draft/Published/Archived control rather than SegmentedControl: publishing a translation
// is refused while the English article is a draft (ChangeKbTranslationStatus's own rule), but
// draft/archived transitions stay allowed regardless — a per-option disabled state SegmentedControl
// has no way to express.
function StatusControl({ value, onChange, disabledAll, disabledPublish }: {
    value: KbStatus;
    onChange(v: KbStatus): void;
    disabledAll: boolean;
    disabledPublish: boolean;
}) {
    const options: { label: string; value: KbStatus }[] = [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
    ];
    return (
        <div style={{ display: 'inline-flex', background: 'var(--bg2)', border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-pill)', padding: 3, gap: 2 }}>
            {options.map((opt) => {
                const disabled = disabledAll || (opt.value === 'published' && disabledPublish);
                const active = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(opt.value)}
                        aria-pressed={active}
                        style={{
                            padding: '5px 12px',
                            borderRadius: 'var(--radius-pill)',
                            border: 'none',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            fontSize: 12.5,
                            fontFamily: 'inherit',
                            fontWeight: 700,
                            background: active ? 'var(--panel)' : 'transparent',
                            color: active ? 'var(--fg)' : 'var(--fg2)',
                            opacity: disabled ? 0.5 : 1,
                            boxShadow: active ? '0 0 0 1.5px var(--field)' : 'none',
                        }}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}
