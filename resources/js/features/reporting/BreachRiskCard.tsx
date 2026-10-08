import { formatDuration } from './formatDuration';
import type { SlaReport } from '../../lib/types';
import { sectionTitle } from '../issues/issueStyles';
import { bar, cardSub, deskCard } from '../support/supportStyles';

function riskColor(pct: number): string {
    return pct < 30 ? 'var(--red)' : pct < 60 ? 'var(--amber)' : 'var(--sup)';
}

export function BreachRiskCard({ breachRisk, tags }: { breachRisk: SlaReport['breach_risk']; tags: SlaReport['tags'] }) {
    return (
        <div style={{ ...deskCard, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
                <div style={sectionTitle(17)}>Breach risk</div>
                <div style={cardSub}>Open tickets closest to first-reply target</div>
            </div>
            {breachRisk.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg3)', fontSize: 13 }}>No tickets at risk right now.</div>
            ) : (
                breachRisk.map((t) => (
                    <div key={t.ticket_id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg3)' }}>{t.ticket_id.slice(0, 6)}</span>
                                {t.requester_name && <span style={{ fontSize: 10.5, color: 'var(--fg2)' }}>{t.requester_name}</span>}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.subject}</div>
                        </div>
                        <div style={{ width: 78, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                            <span style={{ fontSize: 11.5, fontWeight: 700, padding: '1px 8px', borderRadius: 'var(--radius-pill)', color: riskColor(t.pct), background: 'var(--hover)', fontFamily: 'var(--font-mono)' }}>{formatDuration(t.remaining_minutes)}</span>
                            <div style={{ ...bar, width: '100%', height: 5 }}>
                                <div style={{ height: '100%', width: `${t.pct}%`, background: riskColor(t.pct), borderRadius: 'var(--radius-pill)' }} />
                            </div>
                        </div>
                    </div>
                ))
            )}
            <div style={{ flex: 1 }} />
            {tags.length > 0 && (
                <div style={{ padding: '12px 20px', display: 'flex', flexWrap: 'wrap', gap: 7, borderTop: '1px solid var(--border)' }}>
                    {tags.map((tg) => (
                        <span key={tg.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 'var(--radius-pill)', border: 'var(--line) solid var(--border2)', background: 'var(--bg2)', fontSize: 12, color: 'var(--fg2)' }}>
                            {tg.name}
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg3)' }}>{tg.count}</span>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
