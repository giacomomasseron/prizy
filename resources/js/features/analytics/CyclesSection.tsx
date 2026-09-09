import { useState } from 'react';
import { useTeams } from '../teams/hooks';
import { useCycleReport } from './hooks';
import { VelocityTable } from './VelocityTable';
import { BurndownChart } from './BurndownChart';

export function CyclesSection() {
    const teamsQ = useTeams({ mine: true });
    const teams = teamsQ.data?.items ?? [];
    const [teamId, setTeamId] = useState<string | null>(null);
    const [cycleId, setCycleId] = useState<string | null>(null);
    const effectiveTeam = teamId ?? teams[0]?.id ?? '';
    const q = useCycleReport(effectiveTeam, cycleId);

    if (teams.length === 0) return <div style={{ fontSize: 12.5, color: 'var(--fg3)' }}>Join a team to see cycle analytics.</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8 }}>
                <select aria-label="Team" value={effectiveTeam} onChange={(e) => { setTeamId(e.target.value); setCycleId(null); }}
                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--panel)', color: 'var(--fg)', fontSize: 12.5, fontFamily: 'inherit' }}>
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>
            {q.data && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
                    <VelocityTable rows={q.data.cycles} selectedId={q.data.burndown?.cycle_id ?? null} onSelect={setCycleId} />
                    {q.data.burndown ? <BurndownChart burndown={q.data.burndown} /> : <div style={{ fontSize: 12.5, color: 'var(--fg3)' }}>No cycle selected</div>}
                </div>
            )}
        </div>
    );
}
