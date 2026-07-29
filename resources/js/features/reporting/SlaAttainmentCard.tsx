import type { CSSProperties } from 'react';
import { TICKET_CHANNEL } from '../support/ticketMeta';
import type { SlaReport } from '../../lib/types';

function targetLabel(min: number): string {
    return min % 60 === 0 ? `${min / 60}h` : `${min}m`;
}

export function SlaAttainmentCard({ report }: { report: SlaReport }) {
    const pct = report.attainment_pct;
    const turn = (pct ?? 0) / 100;
    const donut: CSSProperties = {
        position: 'relative', width: 104, height: 104, borderRadius: '50%', flexShrink: 0,
        background: `conic-gradient(var(--sup) 0turn ${turn}turn, var(--border) ${turn}turn 1turn)`,
    };
    const chanMax = Math.max(1, ...report.by_channel.map((c) => c.count));
    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>SLA attainment</div>
                <div style={{ fontSize: 11, color: 'var(--fg3)' }}>First-reply target by plan</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={donut}>
                    <div style={{ position: 'absolute', inset: 13, borderRadius: '50%', background: 'var(--panel)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, lineHeight: 1 }}>{pct === null ? '—' : `${pct}%`}</span>
                        <span style={{ fontSize: 10, color: 'var(--fg3)', marginTop: 2 }}>met</span>
                    </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {report.by_plan.length === 0 ? (
                        <span style={{ fontSize: 12, color: 'var(--fg3)' }}>No SLA outcomes in this range.</span>
                    ) : (
                        report.by_plan.map((p) => (
                            <div key={p.policy_id} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                <span style={{ flex: 1, fontSize: 12, color: 'var(--fg2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name} · {targetLabel(p.target_minutes)}</span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{p.attainment_pct === null ? '—' : `${p.attainment_pct}%`}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
            <div style={{ height: 1, background: 'var(--border)' }} />
            <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--fg3)', marginBottom: 11 }}>By channel</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {report.by_channel.map((c) => (
                        <div key={c.channel} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                            <span style={{ width: 15, textAlign: 'center', color: 'var(--fg3)', flexShrink: 0 }}>{TICKET_CHANNEL[c.channel].icon}</span>
                            <span style={{ width: 60, fontSize: 12, color: 'var(--fg2)', flexShrink: 0 }}>{TICKET_CHANNEL[c.channel].label}</span>
                            <div style={{ flex: 1, height: 8, borderRadius: 5, background: 'var(--border)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${(c.count / chanMax) * 100}%`, background: 'var(--blue)', borderRadius: 5 }} />
                            </div>
                            <span style={{ width: 24, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, flexShrink: 0 }}>{c.count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
