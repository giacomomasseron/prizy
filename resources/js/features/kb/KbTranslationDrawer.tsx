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
}

const uppercaseLabel: CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '.05em' };
const neutralPill: CSSProperties = { display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, color: 'var(--fg3)', border: '1px solid var(--border2)' };
const STATUS_PILL: Record<KbStatus, CSSProperties> = {
    draft: { color: '#8b8b95', background: 'rgba(255,255,255,.06)' },
    published: { color: '#3aa76d', background: 'rgba(58,167,109,.15)' },
    archived: { color: '#8b8b95', background: 'transparent', border: '1px solid var(--border2)' },
};
const STATUS_LABEL: Record<KbStatus, string> = { draft: 'Draft', published: 'Published', archived: 'Archived' };

export function KbTranslationDrawer({ articleId, open, initialLocale, articleStatus, onClose, onViewChanges }: KbTranslationDrawerProps) {
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

    return (
        <Drawer open={open} onClose={onClose} side="right" width={820} label="Translations">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Translations</h2>
                    <div style={{ fontSize: 12.5, color: 'var(--fg3)', marginTop: 4 }}>{article?.title}</div>
                </div>
                <IconButton title="Close" onClick={onClose}>✕</IconButton>
            </div>

            <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg2)', overflowY: 'auto', padding: 8 }}>
                    {translationsQuery.isError && (
                        <div role="alert" style={{ color: 'var(--red)', fontSize: 12, padding: 8 }}>
                            {translationsQuery.error instanceof ApiError ? translationsQuery.error.detail : 'Failed to load translations.'}
                        </div>
                    )}
                    {rows.map((r) => (
                        <LocaleRow key={r.locale} row={r} selected={r.locale === locale} onSelect={() => setLocale(r.locale)} />
                    ))}
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    {locale === 'en' ? (
                        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                            <div style={uppercaseLabel}>English (source) · edited in the article editor</div>
                            {article && (
                                <>
                                    <h1 style={{ fontSize: 24, fontWeight: 600, margin: '10px 0 16px' }}>{article.title}</h1>
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
                            onViewChanges={onViewChanges}
                            onClose={onClose}
                        />
                    ) : null}
                </div>
            </div>
        </Drawer>
    );
}

function LocaleRow({ row, selected, onSelect }: { row: KbTranslationSummary; selected: boolean; onSelect(): void }) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className="hover:bg-hover"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                border: selected ? '1px solid var(--sup2)' : '1px solid transparent',
                background: selected ? 'var(--sup2)' : 'transparent',
                borderRadius: 8,
                padding: 8,
                marginBottom: 2,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
            }}
        >
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg3)', flexShrink: 0 }}>{row.locale}</span>
                    {row.stale && (
                        <span
                            title="Source changed since this was translated"
                            style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0 }}
                        />
                    )}
                </div>
                {row.is_source && <div style={{ fontSize: 10.5, color: 'var(--fg3)', marginTop: 1 }}>The article as written</div>}
            </div>
            {row.is_source ? (
                <span style={neutralPill}>Source</span>
            ) : row.status === null ? (
                <span style={neutralPill}>Not translated</span>
            ) : (
                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, ...STATUS_PILL[row.status] }}>
                    {STATUS_LABEL[row.status]}
                </span>
            )}
        </button>
    );
}

interface TranslationEditorProps {
    articleId: string;
    row: KbTranslationSummary;
    article: KbArticleEdit | undefined;
    sourceHtml: string;
    articleStatus: KbStatus;
    onViewChanges(): void;
    onClose(): void;
}

// Keyed by locale in the parent, so switching languages — or closing and reopening the drawer,
// which unmounts everything under Drawer — always starts this component fresh rather than
// carrying one language's unsaved draft into another's fields.
function TranslationEditor({ articleId, row, article, sourceHtml, articleStatus, onViewChanges, onClose }: TranslationEditorProps) {
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
    const [tab, setTab] = useState<Tab>('write');
    const [compareOpen, setCompareOpen] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    useEffect(() => {
        if (detailQuery.data && original === null) {
            setOriginal({ title: detailQuery.data.title, body: detailQuery.data.body });
            setTitle(detailQuery.data.title);
            setBody(detailQuery.data.body);
            setStatus(detailQuery.data.status);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detailQuery.data, original]);

    const [debouncedBody, setDebouncedBody] = useState(body);
    useEffect(() => {
        const t = setTimeout(() => setDebouncedBody(body), 400);
        return () => clearTimeout(t);
    }, [body]);
    useEffect(() => {
        if (tab === 'preview') preview.mutate(debouncedBody);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, debouncedBody]);

    const dirty = original !== null && (title !== original.title || body !== original.body);

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
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <div style={{ textAlign: 'center', maxWidth: 340 }}>
                    <p style={{ fontSize: 14.5, fontWeight: 600, margin: '0 0 6px' }}>Not translated yet</p>
                    <p style={{ fontSize: 12.5, color: 'var(--fg3)', lineHeight: 1.55, margin: '0 0 16px' }}>
                        Start from the English article and edit it, or write this translation from scratch.
                    </p>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                        <Button onClick={startFromEnglish}>Start from English</Button>
                        <Button variant="secondary" onClick={startBlank}>Start blank</Button>
                    </div>
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
                    <div role="alert" style={{ color: 'var(--red)', fontSize: 12 }}>
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
                placeholder="Translated title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}
            />
            <Textarea
                placeholder="Write the translation in markdown, matching the English structure."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.7, minHeight: 340 }}
            />
        </>
    ) : (
        // Safe: this HTML comes solely from POST /kb/preview's response for THIS pane's own body —
        // the same server MarkdownRenderer the article editor's own preview tab already trusts.
        <div className="kb-preview" dangerouslySetInnerHTML={{ __html: preview.data?.html ?? '' }} />
    );

    return (
        <>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {row.stale && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(224,161,58,.12)', border: '1px solid rgba(224,161,58,.35)', borderRadius: 9, padding: '10px 14px', marginBottom: 16 }}>
                        <span style={{ fontSize: 12.5, color: 'var(--fg2)', flex: 1 }}>
                            The English article changed on {formatDate(article?.updated_at ?? null)}, after this translation was last saved. Review it for accuracy.
                        </span>
                        <Button variant="secondary" size="sm" onClick={() => { onViewChanges(); onClose(); }}>View what changed</Button>
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <SegmentedControl<Tab>
                        value={tab}
                        onChange={setTab}
                        options={[{ value: 'write', label: 'Write' }, { value: 'preview', label: 'Preview' }]}
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
                        <div style={{ flex: 1, minWidth: 0, opacity: 0.75 }}>
                            <div style={uppercaseLabel}>English (source)</div>
                            {article && (
                                <>
                                    <h2 style={{ fontSize: 17, fontWeight: 600, margin: '8px 0 10px' }}>{article.title}</h2>
                                    <div className="kb-preview" dangerouslySetInnerHTML={{ __html: sourceHtml }} />
                                </>
                            )}
                        </div>
                    </div>
                ) : editor}
            </div>

            <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', padding: '14px 20px' }}>
                {deleteError && <div role="alert" style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{deleteError}</div>}
                {statusError && <div role="alert" style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{statusError}</div>}
                {saveError && <div role="alert" style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{saveError}</div>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <Button variant="ghost" onClick={handleDelete} disabled={status === null} style={{ color: 'var(--red)' }}>
                        Delete translation
                    </Button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11.5, color: 'var(--fg3)' }}>{dirty ? 'Unsaved changes' : status !== null ? 'Saved' : ''}</span>
                        <StatusControl
                            value={status ?? 'draft'}
                            onChange={handleStatusChange}
                            disabledAll={status === null}
                            disabledPublish={articleStatus !== 'published'}
                        />
                        <Button onClick={handleSave} disabled={!dirty}>Save translation</Button>
                    </div>
                </div>
                {articleStatus !== 'published' && (
                    <p style={{ fontSize: 11.5, color: 'var(--fg3)', margin: '8px 0 0', textAlign: 'right' }}>Publish the English article first</p>
                )}
            </div>
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
        <div style={{ display: 'inline-flex', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 3, gap: 2 }}>
            {options.map((opt) => {
                const disabled = disabledAll || (opt.value === 'published' && disabledPublish);
                const active = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(opt.value)}
                        style={{
                            padding: '4px 13px',
                            borderRadius: 6,
                            border: 'none',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            fontSize: 12,
                            fontFamily: 'inherit',
                            fontWeight: 500,
                            background: active ? 'var(--panel)' : 'transparent',
                            color: active ? 'var(--fg)' : 'var(--fg2)',
                            opacity: disabled ? 0.5 : 1,
                            boxShadow: active ? '0 1px 2px rgba(0,0,0,.18)' : 'none',
                        }}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}
