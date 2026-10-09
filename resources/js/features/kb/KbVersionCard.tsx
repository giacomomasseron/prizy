import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { ApiError } from '../../lib/apiClient';
import { avatarFor } from '../../lib/avatarFor';
import { useKbArticleVersions } from './hooks';
import { LIST_ROW_CLASSES, currentBadge, kbCard, kbLabel, listRow } from './kbStyles';
import { relativeTime } from './kbUtils';

const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;

export function KbVersionCard({ articleId, onOpen }: { articleId: string; onOpen(versionId?: string): void }) {
    const versionsQuery = useKbArticleVersions(articleId);

    // Defensive: the endpoint's contract is an array, but a malformed/unexpected payload should
    // never crash this card — it should just fall back to the empty state.
    const versions = Array.isArray(versionsQuery.data) ? versionsQuery.data : [];

    return (
        <div style={kbCard}>
            <div style={kbLabel}>Version history</div>

            {/* Muted "Loading…" text, matching the established placeholder pattern in
                TicketConversation.tsx's Empty component — this card's siblings (Details,
                Performance) render immediately since their data is already loaded, so this
                placeholder — not an empty gap, and not withholding the heading — is what keeps
                this card visually consistent with them while its own fetch is in flight. */}
            {versionsQuery.isPending && (
                <p style={{ fontSize: 11.5, color: 'var(--fg3)', lineHeight: 1.55, margin: '9px 0 0' }}>Loading…</p>
            )}

            {versionsQuery.isError && (
                <div role="alert" style={{ color: 'var(--red-ink)', fontSize: 12, marginTop: 9 }}>
                    {versionsQuery.error instanceof ApiError ? versionsQuery.error.detail : 'Failed to load version history.'}
                </div>
            )}

            {versionsQuery.isSuccess && (
                versions.length <= 1 ? (
                    <p style={{ fontSize: 11.5, color: 'var(--fg3)', lineHeight: 1.55, margin: '9px 0 0' }}>No edits yet — this is the original.</p>
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, margin: '9px -8px 0' }}>
                            {versions.slice(0, 3).map((v) => (
                                // No inline background: it would beat hover:bg-hover (LIST_ROW_CLASSES).
                                <button key={v.id} type="button" onClick={() => onOpen(v.id)} className={LIST_ROW_CLASSES} style={listRow}>
                                    <Avatar {...avatarFor(v.author)} size={22} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: 12.5, fontWeight: 600, ...ellipsis }}>{v.author.name}</span>
                                            {v.is_current && <span style={currentBadge}>Current</span>}
                                            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg3)', whiteSpace: 'nowrap' }}>
                                                {relativeTime(v.created_at)}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--fg3)', marginTop: 1, ...ellipsis }}>{v.summary}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => onOpen()} style={{ width: '100%', marginTop: 10 }}>
                            {`View all ${versions.length} versions`}
                        </Button>
                    </>
                )
            )}
        </div>
    );
}
