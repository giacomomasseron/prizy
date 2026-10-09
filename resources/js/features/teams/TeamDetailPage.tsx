import type { CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { canDevelop as canDevelopFor } from '../../auth/capabilities';
import { Button } from '../../components/ui/Button';
import { QueryState } from '../../components/ui/QueryState';
import { sectionTitle } from '../issues/issueStyles';
import { emptyState, pageTitle } from '../projects/projectStyles';
import { DANGER_PILL_CLASSES, pillBtn } from '../settings/settingsStyles';
import { useDeleteCycle, useCycles, useTeams } from './hooks';
import { useConfirm } from '../../components/ui/ConfirmProvider';

/** Detail-page frame; the left pad clears the floating "Expand sidebar" button when the sidebar is hidden. */
const frame: CSSProperties = { padding: '26px 30px 80px calc(30px + var(--nav-inset, 0px))', maxWidth: 960, boxSizing: 'border-box' };

export default function TeamDetailPage() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const me = useMe();
    const canDevelop = canDevelopFor(me.data);
    const teams = useTeams();
    const cycles = useCycles(id);
    const del = useDeleteCycle(id);
    const confirm = useConfirm();

    const team = teams.data?.items.find((t) => t.id === id);
    const items = cycles.data?.items ?? [];

    return (
        <div style={frame}>
            <Link to="/teams" className="text-fg2 hover:text-fg" style={{ fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}>← Teams</Link>
            <h1 style={{ ...pageTitle, margin: '10px 0 0' }}><span className="hl">{team ? `${team.identifier} · ${team.name}` : 'Team'}</span></h1>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 28, marginBottom: 12 }}>
                <h2 style={sectionTitle(20)}>Cycles</h2>
                {canDevelop && (
                    <Button size="sm" onClick={() => navigate(`/create?tab=cycle&team=${id}`)}>New cycle</Button>
                )}
            </div>

            <QueryState query={cycles} what="cycles">
                {items.length === 0 && <div style={emptyState}>No cycles in this team yet.</div>}
                {items.length > 0 && (
                    <div style={{ border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-card)', background: 'var(--panel)', overflow: 'hidden' }}>
                        {items.map((c) => (
                            <div key={c.id} className="border-b border-border last:border-b-0" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px' }}>
                                <span style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg2)' }}>{c.starts_at} → {c.ends_at}</span>
                                {canDevelop && (
                                    <button
                                        type="button"
                                        disabled={del.isPending}
                                        onClick={async () => { if (await confirm({ title: `Delete ${c.name}?`, danger: true })) del.mutate(c.id); }}
                                        style={{ ...pillBtn, marginLeft: 'auto' }}
                                        className={DANGER_PILL_CLASSES}
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </QueryState>
        </div>
    );
}
