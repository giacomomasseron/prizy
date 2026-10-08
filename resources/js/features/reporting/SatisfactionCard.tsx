import type { AgentsReport } from '../../lib/types';
import { sectionTitle } from '../issues/issueStyles';
import { bar, cardSub, deskCard } from '../support/supportStyles';

const COLORS: Record<string, string> = { positive: 'var(--green)', negative: 'var(--red)' };

export function SatisfactionCard({ csat }: { csat: AgentsReport['csat'] }) {
    return (
        <div style={{ ...deskCard, padding: '18px 20px' }}>
            <div style={sectionTitle(17)}>Satisfaction</div>
            <div style={{ ...cardSub, marginBottom: 16 }}>{csat.responses} rated conversations</div>
            {csat.responses === 0 ? (
                <div style={{ color: 'var(--fg3)', fontSize: 12.5 }}>No ratings in this range.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {csat.breakdown.map((c) => (
                        <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                            <span style={{ width: 74, fontSize: 12.5, color: 'var(--fg2)', flexShrink: 0 }}>{c.label}</span>
                            <div style={{ ...bar, flex: 1 }}>
                                <div style={{ height: '100%', width: `${c.pct}%`, background: COLORS[c.key], borderRadius: 'var(--radius-pill)' }} />
                            </div>
                            <span style={{ width: 38, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, flexShrink: 0 }}>{c.pct}%</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
