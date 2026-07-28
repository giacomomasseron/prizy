import { formatDuration } from './formatDuration';
import type { SlaReport } from '../../lib/types';

function riskColor(pct: number): string {
    return pct < 30 ? 'var(--red)' : pct < 60 ? 'var(--amber)' : 'var(--sup)';
}

export function BreachRiskCard({ breachRisk, tags }: { breachRisk: SlaReport['breach_risk']; tags: SlaReport['tags'] }) {
    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Breach risk</div>
                <div style={{ fontSize: 11, color: 'var(--fg3)' }}>Open tickets closest to first-reply target</div>
            </div>
            {breachRisk.length === 0 ? (
                <div style={{ padding: 18, textAlign: 'center', color: 'var(--fg3)', fontSize: 12.5 }}>No tickets at risk right now.</div>
            ) : (
                breachRisk.map((t) => (
                    <div key={t.ticket_id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 18px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg3)' }}>{t.ticket_id.slice(0, 6)}</span>
                                {t.requester_name && <span style={{ fontSize: 10.5, color: 'var(--fg2)' }}>{t.requester_name}</span>}
                            </div>
                            <div style={{ fontSize: 12.6, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.subject}</div>
                        </div>
                        <div style={{ width: 78, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                            <span style={{ fontSize: 10.5, fontWeight: 600, padding: '1px 6px', borderRadius: 20, color: riskColor(t.pct), background: 'var(--hover)', fontFamily: 'var(--font-mono)' }}>{formatDuration(t.remaining_minutes)}</span>
                            <div style={{ width: '100%', height: 5, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${t.pct}%`, background: riskColor(t.pct), borderRadius: 4 }} />
                            </div>
                        </div>
                    </div>
                ))
            )}
            <div style={{ flex: 1 }} />
            {tags.length > 0 && (
                <div style={{ padding: '12px 18px', display: 'flex', flexWrap: 'wrap', gap: 7, borderTop: '1px solid var(--border)' }}>
                    {tags.map((tg) => (
                        <span key={tg.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 20, border: '1px solid var(--border2)', background: 'var(--bg2)', fontSize: 11, color: 'var(--fg2)' }}>
                            {tg.name}
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg3)' }}>{tg.count}</span>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
