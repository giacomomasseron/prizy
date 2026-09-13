import type { CSSProperties } from 'react';
import { Button } from '../../components/ui/Button';
import { ApiError } from '../../lib/apiClient';
import { useKbArticleTranslations } from './hooks';
import { StatusPill } from './StatusPill';

const card: CSSProperties = { border: '1px solid var(--border)', borderRadius: 10, padding: 14 };
const cardTitle: CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '.05em' };
// Shares StatusPill's pill shape but for the two states StatusPill doesn't cover (a translation
// row can be the source, or simply not exist yet) — the archived variant's border-only look is
// the closest existing "neutral" pill, so this mirrors it rather than inventing a new look.
const neutralPill: CSSProperties = { display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, color: 'var(--fg3)', border: '1px solid var(--border2)' };

export function KbTranslationCard({ articleId, onOpen }: { articleId: string; onOpen(locale?: string): void }) {
    const translationsQuery = useKbArticleTranslations(articleId);

    // Defensive: same contract as KbVersionCard — the endpoint's contract is an array, but a
    // malformed/unexpected payload should never crash this card — it should just fall back to
    // the empty state.
    const translations = Array.isArray(translationsQuery.data) ? translationsQuery.data : [];

    return (
        <div style={card}>
            <div style={cardTitle}>Translations</div>

            {/* Same placeholder pattern as KbVersionCard: heading renders unconditionally, this
                muted "Loading…" text fills the gap while the fetch is in flight. */}
            {translationsQuery.isPending && (
                <p style={{ fontSize: 11.5, color: 'var(--fg3)', lineHeight: 1.55, marginTop: 8 }}>Loading…</p>
            )}

            {translationsQuery.isError && (
                <div role="alert" style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>
                    {translationsQuery.error instanceof ApiError ? translationsQuery.error.detail : 'Failed to load translations.'}
                </div>
            )}

            {translationsQuery.isSuccess && (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8 }}>
                        {translations.map((t) => (
                            <button
                                key={t.locale}
                                type="button"
                                onClick={() => onOpen(t.locale)}
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
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 12.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {t.name}
                                    </span>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg3)', flexShrink: 0 }}>
                                        {t.locale}
                                    </span>
                                    {t.stale && (
                                        <span
                                            title="Source changed since this was translated"
                                            style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0 }}
                                        />
                                    )}
                                </div>
                                {t.is_source ? (
                                    <span style={neutralPill}>Source</span>
                                ) : t.status === null ? (
                                    <span style={neutralPill}>Not translated</span>
                                ) : (
                                    <StatusPill status={t.status} />
                                )}
                            </button>
                        ))}
                    </div>
                    <Button variant="secondary" onClick={() => onOpen()} style={{ width: '100%', marginTop: 10, justifyContent: 'center' }}>
                        Manage translations
                    </Button>
                </>
            )}
        </div>
    );
}
