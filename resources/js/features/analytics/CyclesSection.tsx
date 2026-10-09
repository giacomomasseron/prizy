import { useState } from 'react';
import { useTeams } from '../teams/hooks';
import { useCycleReport } from './hooks';
import { VelocityTable } from './VelocityTable';
import { BurndownChart } from './BurndownChart';
import { FIELD_CLASSES } from '../../components/ui/Input';
import { QueryState } from '../../components/ui/QueryState';
import { selectStyle } from '../settings/settingsStyles';

export function CyclesSection() {
    const teamsQ = useTeams({ mine: true });
    const teams = teamsQ.data?.items ?? [];
    const [teamId, setTeamId] = useState<string | null>(null);
    const [cycleId, setCycleId] = useState<string | null>(null);
    const effectiveTeam = teamId ?? teams[0]?.id ?? '';
    const q = useCycleReport(effectiveTeam, cycleId);

    return (
        <QueryState query={teamsQ} what="your teams">
            {teams.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--fg3)' }}>Join a team to see cycle analytics.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <select aria-label="Team" value={effectiveTeam} onChange={(e) => { setTeamId(e.target.value); setCycleId(null); }}
                            className={FIELD_CLASSES} style={{ ...selectStyle, fontSize: 13, padding: '6px 14px' }}>
                            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <QueryState query={q} what="cycle analytics">
                        {q.data && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
                                <VelocityTable rows={q.data.cycles} selectedId={q.data.burndown?.cycle_id ?? null} onSelect={setCycleId} />
                                {q.data.burndown ? <BurndownChart burndown={q.data.burndown} /> : <div style={{ fontSize: 13, color: 'var(--fg3)' }}>No cycle selected</div>}
                            </div>
                        )}
                    </QueryState>
                </div>
            )}
        </QueryState>
    );
}
