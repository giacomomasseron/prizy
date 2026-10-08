import { useEffect, useState } from 'react';
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
import { DIFF_TINT, currentBadge, diffBox, drawerFooter, drawerHeader, drawerList, drawerSub, footNote, kbLabel, pickRow, pickRowClasses } from './kbStyles';
import { modalTitle } from '../settings/settingsStyles';
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
            <div style={drawerHeader}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={modalTitle}>Version history</h2>
                    <div style={drawerSub}>{articleQuery.data?.title}</div>
                </div>
                <IconButton title="Close" onClick={onClose}>✕</IconButton>
            </div>

            <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                <div style={drawerList}>
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

                <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '18px 22px 28px' }}>
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

            <div data-testid="kb-version-footer" style={drawerFooter}>
                {restoreError && <div role="alert" style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{restoreError}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <p style={{ ...footNote, flex: 1, minWidth: 0, margin: 0 }}>
                        Restoring copies this version’s title and body into the article. Nothing is overwritten — the current text is kept as a version.
                    </p>
                    <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
                    <Button size="sm" onClick={handleRestore} disabled={!detail || isCurrent}>Restore this version</Button>
                </div>
            </div>
        </Drawer>
    );
}

function VersionRow({ version, selected, onSelect }: { version: KbVersionSummary; selected: boolean; onSelect(): void }) {
    return (
        // No inline background: the selected tint and the hover both live in classes (pickRowClasses).
        <button type="button" onClick={onSelect} className={pickRowClasses(selected)} style={{ ...pickRow, display: 'flex', alignItems: 'flex-start', gap: 9 }}>
            <Avatar {...avatarFor(version.author)} size={22} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {version.author.name}
                    </span>
                    {version.is_current && <span style={{ ...currentBadge, marginLeft: 'auto' }}>Current</span>}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.8, color: 'var(--fg3)', marginTop: 4 }}>{formatDateTime(version.created_at)}</div>
                <div style={{ fontSize: 11.5, color: 'var(--fg2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{version.summary}</div>
            </div>
        </button>
    );
}

// The sign is a second cue besides the tint; aria-hidden so each line's text stays its own element.
function DiffSign({ sign }: { sign: '+' | '-' | ' ' }) {
    return (
        <span aria-hidden="true" style={{ width: 10, flexShrink: 0, fontWeight: 700, userSelect: 'none', color: sign === '+' ? 'var(--green)' : sign === '-' ? 'var(--red)' : 'transparent' }}>
            {sign === '+' ? '+' : sign === '-' ? '−' : ''}
        </span>
    );
}

function ChangesTab({ detail }: { detail: KbVersionDetail | undefined }) {
    if (!detail) return null;

    if (detail.diff === null) {
        return (
            <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--fg3)', padding: '40px 0', margin: 0 }}>
                This is the current version — nothing to compare.
            </p>
        );
    }

    const diff = detail.diff;
    const titleRow = { display: 'flex', gap: 10, padding: '9px 13px', fontFamily: 'var(--font-mono)', fontSize: 12.2, lineHeight: 1.6, color: 'var(--fg)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' } as const;

    return (
        <div>
            {diff.title && (
                <div style={{ ...diffBox, marginBottom: 18 }}>
                    <div style={{ ...kbLabel, padding: '7px 13px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>Title</div>
                    <div style={{ ...titleRow, background: DIFF_TINT.del }}>
                        <DiffSign sign="-" />
                        <span style={{ flex: 1, minWidth: 0 }}>{diff.title.from}</span>
                    </div>
                    <div style={{ ...titleRow, background: DIFF_TINT.add, borderTop: '1px solid var(--border)' }}>
                        <DiffSign sign="+" />
                        <span style={{ flex: 1, minWidth: 0 }}>{diff.title.to}</span>
                    </div>
                </div>
            )}
            <div style={{ ...diffBox, padding: '8px 0' }}>
                {diff.lines.map((line, i) => (
                    <div
                        key={i}
                        style={{
                            display: 'flex', gap: 10, padding: '2px 14px', minHeight: 22,
                            fontFamily: 'var(--font-mono)', fontSize: 12.2, lineHeight: 1.85, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                            color: line.sign === ' ' ? 'var(--fg3)' : 'var(--fg)',
                            ...(line.sign === '+' ? { background: DIFF_TINT.add } : line.sign === '-' ? { background: DIFF_TINT.del } : {}),
                        }}
                    >
                        <DiffSign sign={line.sign} />
                        <span style={{ flex: 1, minWidth: 0 }}>{line.text}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function FullTextTab({ detail }: { detail: KbVersionDetail | undefined }) {
    return (
        <div>
            <div style={kbLabel}>This version, as customers would have seen it</div>
            {detail && (
                <>
                    <h1 style={{ margin: '10px 0 8px', fontSize: 24, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.25 }}>{detail.title}</h1>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg3)', marginBottom: 22 }}>
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
