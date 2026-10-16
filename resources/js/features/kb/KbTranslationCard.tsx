import { Button } from '../../components/ui/Button';
import { ApiError } from '../../lib/apiClient';
import { useKbArticleTranslations } from './hooks';
import { LIST_ROW_CLASSES, kbCard, kbLabel, listRow, notTranslatedPill, sourceTag, staleDot } from './kbStyles';
import { StatusPill } from './StatusPill';

export function KbTranslationCard({ articleId, onOpen, readOnly = false }: { articleId: string; onOpen(locale?: string): void; readOnly?: boolean }) {
    const translationsQuery = useKbArticleTranslations(articleId);

    // Defensive: same contract as KbVersionCard — the endpoint's contract is an array, but a
    // malformed/unexpected payload should never crash this card — it should just fall back to
    // the empty state.
    const translations = Array.isArray(translationsQuery.data) ? translationsQuery.data : [];

    return (
        <div style={kbCard}>
            <div style={kbLabel}>Translations</div>

            {/* Same placeholder pattern as KbVersionCard: heading renders unconditionally, this
                muted "Loading…" text fills the gap while the fetch is in flight. */}
            {translationsQuery.isPending && (
                <p style={{ fontSize: 11.5, color: 'var(--fg3)', lineHeight: 1.55, margin: '9px 0 0' }}>Loading…</p>
            )}

            {translationsQuery.isError && (
                <div role="alert" style={{ color: 'var(--red-ink)', fontSize: 12, marginTop: 9 }}>
                    {translationsQuery.error instanceof ApiError ? translationsQuery.error.detail : 'Failed to load translations.'}
                </div>
            )}

            {translationsQuery.isSuccess && (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, margin: '9px -8px 0' }}>
                        {translations.map((t) => (
                            // No inline background: it would beat hover:bg-hover (LIST_ROW_CLASSES).
                            <button key={t.locale} type="button" onClick={() => onOpen(t.locale)} className={LIST_ROW_CLASSES} style={listRow}>
                                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {t.name}
                                </span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg3)', flexShrink: 0 }}>{t.locale}</span>
                                {t.stale && <span title="Source changed since this was translated" style={staleDot} />}
                                {t.is_source ? (
                                    <span style={sourceTag}>Source</span>
                                ) : t.status === null ? (
                                    <span style={notTranslatedPill}>Not translated</span>
                                ) : (
                                    <StatusPill status={t.status} />
                                )}
                            </button>
                        ))}
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => onOpen()} style={{ width: '100%', marginTop: 10 }}>
                        {readOnly ? 'View translations' : 'Manage translations'}
                    </Button>
                </>
            )}
        </div>
    );
}
