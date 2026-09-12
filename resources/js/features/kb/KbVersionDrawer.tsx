import { useEffect, useState, type CSSProperties } from 'react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { Drawer } from '../../components/ui/Drawer';
import { IconButton } from '../../components/ui/IconButton';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { ApiError } from '../../lib/apiClient';
import { avatarFor } from '../../lib/avatarFor';
import { useKbArticle, useKbArticleVersion, useKbArticleVersions, useRestoreKbArticleVersion } from './hooks';
import { formatDate, formatDateTime } from './kbUtils';
import type { KbArticleEdit, KbVersionDetail, KbVersionSummary } from './types';

type Tab = 'changes' | 'fulltext';

export interface KbVersionDrawerProps {
    articleId: string;
    open: boolean;
    initialVersionId: string | null;
    dirty: boolean;
    onClose(): void;
    // Carries the restored KbArticleEdit alongside the message — Review round 1, Finding 1
    // (Critical): a message string alone left EditorForm's displayed title/body stale after a
    // successful restore (the keyed remount only fires on an id change, which a restore never
    // causes). EditorForm applies this payload to its own title/body state on success.
    onRestored(msg: string, article: KbArticleEdit): void;
    // Not part of Task 5's contract: KbVersionDrawer can only see `dirty`, never the editor's live
    // title/body — those are EditorForm's own local state. For "your current text is saved to
    // history first" (the confirm dialog's promise) to be literally true, the *actual* unsaved
    // draft has to reach the server before the restore call fires, which only EditorForm's own
    // save path can do. This prop is that hook: EditorForm passes its persist function, called
    // here only when `dirty`, and awaited (its rejection aborts the restore) before restoring.
    onSaveFirst(): Promise<void>;
}

const uppercaseLabel: CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '.05em' };
const diffRowBase: CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 12.2, whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: '2px 14px', minHeight: 22 };

export function KbVersionDrawer({ articleId, open, initialVersionId, dirty, onClose, onRestored, onSaveFirst }: KbVersionDrawerProps) {
    const articleQuery = useKbArticle(articleId);
    const versionsQuery = useKbArticleVersions(articleId);
    // Defensive, matching KbVersionCard's convention: an unexpected payload shape falls back to an
    // empty list rather than crashing the drawer.
    const versions = Array.isArray(versionsQuery.data) ? versionsQuery.data : [];

    const [selected, setSelected] = useState<string | null>(initialVersionId);
    const [tab, setTab] = useState<Tab>('changes');
    const [restoreError, setRestoreError] = useState<string | null>(null);
    const confirm = useConfirm();
    const restoreVersion = useRestoreKbArticleVersion();

    // Re-seed the selection from the caller every time the drawer transitions to open, so
    // reopening it (from a different row, or via "View all N versions") starts fresh rather than
    // showing whatever was selected the last time it was open.
    useEffect(() => {
        if (open) setSelected(initialVersionId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // When opened with no specific version (initialVersionId null), default to the most recent
    // PAST version once the list has loaded — versions[0] is always the current one.
    useEffect(() => {
        if (open && selected === null && versions.length > 0) {
            setSelected(versions[1]?.id ?? versions[0]?.id ?? null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, selected, versions.length]);

    // Only fetch the detail while the drawer is actually open — closing it shouldn't keep a stale
    // per-version query alive in the background.
    const detailQuery = useKbArticleVersion(articleId, open ? selected : null);
    const detail = detailQuery.data;
    const isCurrent = detail ? detail.is_current : (versions.find((v) => v.id === selected)?.is_current ?? false);

    async function handleRestore() {
        if (!selected || !detail || isCurrent) return;
        const ok = await confirm({
            title: 'Restore this version?',
            message: `The article’s title and body will be replaced with the version from ${formatDate(detail.created_at)}. Your current text is saved to history first, so you can undo this.`,
            confirmLabel: 'Restore',
            cancelLabel: 'Keep current',
        });
        if (!ok) return;
        setRestoreError(null);
        try {
            if (dirty) {
                await onSaveFirst();
            }
            const restoredArticle = await restoreVersion.mutateAsync({ articleId, versionId: selected });
            onClose();
            onRestored(`Restored the version from ${formatDateTime(detail.created_at)}`, restoredArticle);
        } catch (err) {
            setRestoreError(err instanceof ApiError ? err.detail : 'Failed to restore this version.');
        }
    }

    return (
        <Drawer open={open} onClose={onClose} side="right" width={820} label="Version history">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Version history</h2>
                    <div style={{ fontSize: 12.5, color: 'var(--fg3)', marginTop: 4 }}>{articleQuery.data?.title}</div>
                </div>
                <IconButton title="Close" onClick={onClose}>✕</IconButton>
            </div>

            <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg2)', overflowY: 'auto', padding: 8 }}>
                    {/* Review round 1, Finding 2: a failed fetch used to leave this pane silently
                        empty. Surface it inline instead, following KbVersionCard.tsx's convention. */}
                    {versionsQuery.isError && (
                        <div role="alert" style={{ color: 'var(--red)', fontSize: 12, padding: 8 }}>
                            {versionsQuery.error instanceof ApiError ? versionsQuery.error.detail : 'Failed to load version history.'}
                        </div>
                    )}
                    {versions.map((v) => (
                        <VersionRow key={v.id} version={v} selected={v.id === selected} onSelect={() => setSelected(v.id)} />
                    ))}
                </div>

                <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: 20 }}>
                    {dirty && (
                        <div style={{ fontSize: 12, color: 'var(--fg3)', marginBottom: 12 }}>
                            You have unsaved changes — this compares against the last saved version.
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <SegmentedControl<Tab>
                            value={tab}
                            onChange={setTab}
                            options={[{ value: 'changes', label: 'Changes' }, { value: 'fulltext', label: 'Full text' }]}
                        />
                        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg3)' }}>
                            {detail ? (isCurrent ? 'current version' : detail.diff ? `+${detail.diff.added} −${detail.diff.removed} lines` : '') : ''}
                        </span>
                    </div>

                    {/* Review round 1, Finding 2: same convention for the per-version fetch — an
                        error left both tabs silently blank forever (a query error never resolves
                        `detail`, so ChangesTab/FullTextTab had nothing to render and nothing to
                        say). The non-error branches below are otherwise unchanged. */}
                    {detailQuery.isError ? (
                        <div role="alert" style={{ color: 'var(--red)', fontSize: 12 }}>
                            {detailQuery.error instanceof ApiError ? detailQuery.error.detail : 'Failed to load this version.'}
                        </div>
                    ) : (
                        tab === 'changes' ? <ChangesTab detail={detail} /> : <FullTextTab detail={detail} />
                    )}
                </div>
            </div>

            <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', padding: '14px 20px' }}>
                <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--fg3)' }}>
                    Restoring copies this version’s title and body into the article. Nothing is overwritten — the current text is kept as a version.
                </p>
                {restoreError && <div role="alert" style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{restoreError}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleRestore} disabled={!detail || isCurrent}>Restore this version</Button>
                </div>
            </div>
        </Drawer>
    );
}

function VersionRow({ version, selected, onSelect }: { version: KbVersionSummary; selected: boolean; onSelect(): void }) {
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
            <Avatar {...avatarFor(version.author)} size={22} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12.2, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {version.author.name}
                    </span>
                    {version.is_current && (
                        <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--sup)', background: 'var(--sup2)', borderRadius: 20, padding: '1px 6px' }}>
                            Current
                        </span>
                    )}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.8, color: 'var(--fg3)' }}>{formatDateTime(version.created_at)}</div>
                <div style={{ fontSize: 11.5, color: 'var(--fg2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{version.summary}</div>
            </div>
        </button>
    );
}

function ChangesTab({ detail }: { detail: KbVersionDetail | undefined }) {
    if (!detail) return null;

    if (detail.diff === null) {
        return (
            <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--fg3)' }}>
                This is the current version — nothing to compare.
            </p>
        );
    }

    const diff = detail.diff;

    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 11, overflow: 'hidden' }}>
            {diff.title && (
                <div style={{ borderBottom: '1px solid var(--border)' }}>
                    <div style={{ ...uppercaseLabel, padding: '8px 14px 4px' }}>Title</div>
                    <div style={{ ...diffRowBase, lineHeight: 1.6, background: 'rgba(235,87,87,.09)' }}>{diff.title.from}</div>
                    <div style={{ ...diffRowBase, lineHeight: 1.6, background: 'rgba(58,167,109,.12)', borderTop: '1px solid var(--border)' }}>{diff.title.to}</div>
                </div>
            )}
            {diff.lines.map((line, i) => (
                <div
                    key={i}
                    style={{
                        ...diffRowBase,
                        lineHeight: 1.85,
                        color: line.sign === '+' ? 'var(--sup)' : line.sign === '-' ? 'var(--red)' : 'var(--fg3)',
                        background: line.sign === '+' ? 'rgba(58,167,109,.12)' : line.sign === '-' ? 'rgba(235,87,87,.10)' : undefined,
                    }}
                >
                    {line.text}
                </div>
            ))}
        </div>
    );
}

function FullTextTab({ detail }: { detail: KbVersionDetail | undefined }) {
    return (
        <div>
            <div style={uppercaseLabel}>This version, as customers would have seen it</div>
            {detail && (
                <>
                    <h1 style={{ fontSize: 24, fontWeight: 600, margin: '10px 0 4px' }}>{detail.title}</h1>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg3)', marginBottom: 16 }}>
                        {formatDateTime(detail.created_at)} · {detail.author.name}
                    </div>
                    {/* Safe: this HTML comes solely from the server's MarkdownRenderer (html_input=>'escape',
                        allow_unsafe_links=>false) for this specific version's stored body, returned only by
                        GET /kb/articles/:id/versions/:id — the same renderer whose output the public
                        help-center article page and this editor's own Preview tab already trust via
                        dangerouslySetInnerHTML. SearchPage.tsx's blanket rule against dangerouslySetInnerHTML
                        guards a different situation (an unsanitized string with no renderer anywhere in its
                        path); that does not apply here since this string is always pre-escaped server-side
                        before it ever reaches the client. */}
                    <div className="kb-preview" dangerouslySetInnerHTML={{ __html: detail.html }} />
                </>
            )}
        </div>
    );
}
