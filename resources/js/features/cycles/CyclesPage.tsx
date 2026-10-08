import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { canDevelop as canDevelopFor } from '../../auth/capabilities';
import { useCycles, useDeleteCycle, useTeams } from '../teams/hooks';
import { cycleState, type CycleState } from './cycleState';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { Button } from '../../components/ui/Button';
import { ApiError } from '../../lib/apiClient';
import { DELETE_X_CLASSES, deleteXStyle, emptyState, pageCount, pageTitle, titleRow } from '../projects/projectStyles';
import { alertBox } from '../settings/settingsStyles';
import { statusTag, tint } from '../support/supportStyles';
import { useState, type CSSProperties } from 'react';

// State tags tint from theme tokens (statusTag → color-mix), so no fixed rgba values.
const STATE_TAG: Record<CycleState, { label: string; color: string }> = {
    active:    { label: 'Active',    color: 'var(--amber)' },
    upcoming:  { label: 'Upcoming',  color: 'var(--fg3)' },
    completed: { label: 'Completed', color: 'var(--green)' },
};
/** Detail-page frame; the left pad clears the floating "Expand sidebar" button when the sidebar is hidden. */
const frame: CSSProperties = { padding: '26px 30px 80px calc(30px + var(--nav-inset, 0px))', maxWidth: 960, boxSizing: 'border-box' };
const card: CSSProperties = { border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-card)', background: 'var(--panel)', overflow: 'hidden' };

export default function CyclesPage() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const me = useMe();
    const canDevelop = canDevelopFor(me.data);
    const teams = useTeams();
    const cycles = useCycles(id);
    const del = useDeleteCycle(id);
    const confirm = useConfirm();
    const [error, setError] = useState<string | null>(null);

    const team = teams.data?.items.find((t) => t.id === id);
    const items = cycles.data?.items ?? [];

    return (
        <div style={frame}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 13.5 }}>
                <Link to="/teams" className="text-fg2 hover:text-fg" style={{ textDecoration: 'none' }}>Teams</Link>
                <span style={{ color: 'var(--fg3)' }}>/</span>
                <span style={{ color: 'var(--fg)', fontWeight: 700 }}>{team ? team.name : 'Team'}</span>
                <span style={{ color: 'var(--fg3)' }}>/</span>
                <span style={{ color: 'var(--fg2)' }}>Cycles</span>
            </div>

            <div style={titleRow}>
                <h1 style={pageTitle}><span className="hl">Cycles</span></h1>
                <span data-testid="cycles-count" style={pageCount}>{items.length}</span>
                {canDevelop && (
                    <Button style={{ marginLeft: 'auto', alignSelf: 'center' }} onClick={() => navigate(`/create?tab=cycle&team=${id}`)}>New cycle</Button>
                )}
            </div>
            {error && <div role="alert" style={{ ...alertBox, color: 'var(--red)', background: tint('var(--red)', 10), marginBottom: 12 }}>{error}</div>}

            {items.length > 0 && (
                <div style={card}>
                    {items.map((c) => {
                        const st = cycleState(c.starts_at, c.ends_at, new Date());
                        const tag = STATE_TAG[st];
                        return (
                            <div key={c.id} data-testid="cycle-card" className="border-b border-border last:border-b-0" style={{ padding: '14px 18px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                                    <span style={{ fontSize: 14.5, fontWeight: 700 }}>{c.name}</span>
                                    <span data-testid="cycle-tag" style={statusTag(tag.color)}>{tag.label}</span>
                                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg2)' }}>{c.starts_at.slice(0, 10)} → {c.ends_at.slice(0, 10)}</span>
                                    {canDevelop && (
                                        <button type="button" aria-label={`Delete ${c.name}`}
                                            onClick={async () => { setError(null); if (await confirm({ title: `Delete ${c.name}?`, danger: true })) del.mutate(c.id, { onError: (e) => setError((e as ApiError).message) }); }}
                                            style={deleteXStyle} className={DELETE_X_CLASSES}>×</button>
                                    )}
                                </div>
                                {c.cooldown_days > 0 && <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--fg3)' }}>Cooldown: {c.cooldown_days} day{c.cooldown_days === 1 ? '' : 's'}</div>}
                            </div>
                        );
                    })}
                </div>
            )}
            {items.length === 0 && !cycles.isLoading && (
                <div style={{ ...emptyState, marginTop: 12 }}>No cycles in this team yet.</div>
            )}
        </div>
    );
}
