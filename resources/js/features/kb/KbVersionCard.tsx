import type { CSSProperties } from 'react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { ApiError } from '../../lib/apiClient';
import { avatarFor } from '../../lib/avatarFor';
import { useKbArticleVersions } from './hooks';
import { relativeTime } from './kbUtils';

const card: CSSProperties = { border: '1px solid var(--border)', borderRadius: 10, padding: 14 };
const cardTitle: CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '.05em' };

export function KbVersionCard({ articleId, onOpen }: { articleId: string; onOpen(versionId?: string): void }) {
    const versionsQuery = useKbArticleVersions(articleId);
    // Nothing renders — not even the title — until the query settles: the card's whole point is
    // to show real version data, so a bare "Version history" heading sitting above a blank gap
    // while the fetch is in flight would just be noise.
    if (versionsQuery.isPending) return null;

    // Defensive: the endpoint's contract is an array, but a malformed/unexpected payload should
    // never crash this card — it should just fall back to the empty state.
    const versions = Array.isArray(versionsQuery.data) ? versionsQuery.data : [];

    return (
        <div style={card}>
            <div style={cardTitle}>Version history</div>

            {versionsQuery.isError && (
                <div role="alert" style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>
                    {versionsQuery.error instanceof ApiError ? versionsQuery.error.detail : 'Failed to load version history.'}
                </div>
            )}

            {!versionsQuery.isError && (
                versions.length <= 1 ? (
                    <p style={{ fontSize: 11.5, color: 'var(--fg3)', lineHeight: 1.55, marginTop: 8 }}>No edits yet — this is the original.</p>
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8 }}>
                            {versions.slice(0, 3).map((v) => (
                                <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => onOpen(v.id)}
                                    className="hover:bg-hover"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        width: '100%',
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: 8,
                                        padding: '6px 4px',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    <Avatar {...avatarFor(v.author)} size={22} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: 12.2, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {v.author.name}
                                            </span>
                                            {v.is_current && (
                                                <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--sup)', background: 'var(--sup2)', borderRadius: 20, padding: '1px 6px' }}>
                                                    Current
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--fg3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {v.summary}
                                        </div>
                                    </div>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg3)', flexShrink: 0 }}>
                                        {relativeTime(v.created_at)}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <Button variant="secondary" onClick={() => onOpen()} style={{ width: '100%', marginTop: 10, justifyContent: 'center' }}>
                            {`View all ${versions.length} versions`}
                        </Button>
                    </>
                )
            )}
        </div>
    );
}
