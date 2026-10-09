import type { CSSProperties } from 'react';
import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';
import { formatDuration } from './formatDuration';
import type { AgentRow } from '../../lib/types';
import { sectionTitle } from '../issues/issueStyles';
import { bar, cardSub, deskCard, smallLabel } from '../support/supportStyles';

const GRID = 'minmax(140px,2fr) repeat(5,minmax(64px,1fr))';
const head: CSSProperties = { display: 'grid', gridTemplateColumns: GRID, padding: '10px 20px', borderBottom: '1px solid var(--border)', ...smallLabel };
const num: CSSProperties = { textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12.5 };

function csatColor(pct: number): string {
    return pct >= 92 ? 'var(--green)' : pct >= 88 ? 'var(--amber)' : 'var(--red)';
}

export function AgentPerformanceTable({ agents }: { agents: AgentRow[] }) {
    return (
        <div style={{ ...deskCard, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
                <div style={sectionTitle(17)}>Agent performance</div>
                <div style={cardSub}>Sorted by solved</div>
            </div>
            <div style={head}>
                <div>Agent</div>
                <div style={{ textAlign: 'right' }}>Assigned</div>
                <div style={{ textAlign: 'right' }}>Solved</div>
                <div style={{ textAlign: 'right' }}>First reply</div>
                <div style={{ textAlign: 'right' }}>Resolution</div>
                <div style={{ textAlign: 'right' }}>CSAT</div>
            </div>
            {agents.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg3)', fontSize: 13 }}>No agent activity in this range.</div>
            ) : (
                agents.map((a) => (
                    <div key={a.id} style={{ display: 'grid', gridTemplateColumns: GRID, alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                            <Avatar {...avatarFor({ id: a.id, name: a.name })} size={28} />
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                                <div style={{ fontSize: 11.5, color: 'var(--fg3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.email}</div>
                            </div>
                        </div>
                        <div style={num}>{a.assigned}</div>
                        <div style={{ ...num, color: 'var(--sup-ink)' }}>{a.solved}</div>
                        <div style={{ ...num, color: 'var(--fg2)' }}>{a.median_first_reply_minutes === null ? '—' : formatDuration(a.median_first_reply_minutes)}</div>
                        <div style={{ ...num, color: 'var(--fg2)' }}>{a.median_resolution_minutes === null ? '—' : formatDuration(a.median_resolution_minutes)}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                            <div style={{ ...bar, width: 52, height: 6 }}>
                                <div style={{ height: '100%', width: `${a.csat_pct ?? 0}%`, background: csatColor(a.csat_pct ?? 0), borderRadius: 'var(--radius-pill)' }} />
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, width: 34, textAlign: 'right' }}>{a.csat_pct === null ? '—' : `${a.csat_pct}%`}</span>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
