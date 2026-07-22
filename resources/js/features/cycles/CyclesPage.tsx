import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { useCycles, useDeleteCycle, useTeams } from '../teams/hooks';
import { cycleState, type CycleState } from './cycleState';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { ApiError } from '../../lib/apiClient';
import { useState, type CSSProperties } from 'react';

const STATE_TAG: Record<CycleState, { label: string; color: string; bg: string }> = {
    active:    { label: 'Active',    color: 'var(--amber)', bg: 'rgba(224,161,58,.14)' },
    upcoming:  { label: 'Upcoming',  color: 'var(--fg3)',   bg: 'var(--bg2)' },
    completed: { label: 'Completed', color: 'var(--green)', bg: 'rgba(75,171,102,.14)' },
};
const card: CSSProperties = { border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', background: 'var(--panel)', marginTop: 12 };

export default function CyclesPage() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const me = useMe();
    const canDevelop = !!me.data?.is_developer && me.data?.admin_level !== 'viewer';
    const teams = useTeams();
    const cycles = useCycles(id);
    const del = useDeleteCycle(id);
    const confirm = useConfirm();
    const [error, setError] = useState<string | null>(null);

    const team = teams.data?.items.find((t) => t.id === id);
    const items = cycles.data?.items ?? [];

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 30px 80px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 12.5 }}>
                <Link to="/teams" style={{ color: 'var(--fg2)', textDecoration: 'none' }}>Teams</Link>
                <span style={{ color: 'var(--fg3)' }}>/</span>
                <span style={{ color: 'var(--fg)', fontWeight: 500 }}>{team ? team.name : 'Team'}</span>
                <span style={{ color: 'var(--fg3)' }}>/</span>
                <span style={{ color: 'var(--fg2)' }}>Cycles</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-.02em' }}>Cycles</h1>
                <span data-testid="cycles-count" style={{ fontSize: 12.5, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>{items.length}</span>
                {canDevelop && (
                    <button type="button" onClick={() => navigate(`/create?tab=cycle&team=${id}`)}
                        style={{ marginLeft: 'auto', background: 'var(--accent)', color: '#fff', padding: '8px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer' }}>New cycle</button>
                )}
            </div>
            {error && <div role="alert" style={{ color: 'var(--red)', fontSize: 12.5, marginTop: 8 }}>{error}</div>}

            {items.map((c) => {
                const st = cycleState(c.starts_at, c.ends_at, new Date());
                const tag = STATE_TAG[st];
                return (
                    <div key={c.id} style={card} data-testid="cycle-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                            <span style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</span>
                            <span data-testid="cycle-tag" style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 9px', borderRadius: 20, color: tag.color, background: tag.bg }}>{tag.label}</span>
                            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg2)' }}>{c.starts_at.slice(0, 10)} → {c.ends_at.slice(0, 10)}</span>
                            {canDevelop && (
                                <button type="button" aria-label={`Delete ${c.name}`}
                                    onClick={async () => { setError(null); if (await confirm({ title: `Delete ${c.name}?`, danger: true })) del.mutate(c.id, { onError: (e) => setError((e as ApiError).message) }); }}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--fg3)', fontSize: 13, cursor: 'pointer' }}>×</button>
                            )}
                        </div>
                        {c.cooldown_days > 0 && <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--fg3)' }}>Cooldown: {c.cooldown_days} day{c.cooldown_days === 1 ? '' : 's'}</div>}
                    </div>
                );
            })}
            {items.length === 0 && !cycles.isLoading && (
                <div style={{ padding: 44, textAlign: 'center', color: 'var(--fg3)', fontSize: 13, border: '1px dashed var(--border2)', borderRadius: 12, marginTop: 12 }}>No cycles in this team yet.</div>
            )}
        </div>
    );
}
