import { Link, useNavigate } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { TeamTile } from '../../components/ui/TeamTile';
import { emptyState } from '../projects/projectStyles';
import { listCard } from '../settings/settingsStyles';
import { useTeams } from './hooks';

export default function TeamsPage() {
    const me = useMe();
    const canManage = ['owner', 'admin'].includes(me.data?.admin_level ?? '');
    const teams = useTeams();
    const navigate = useNavigate();
    const items = teams.data?.items ?? [];

    return (
        <>
            <PageHeader
                title="Teams"
                actions={canManage ? <Button onClick={() => navigate('/settings/teams')}>New team</Button> : undefined}
            />

            <div style={{ padding: '4px 26px 40px' }}>
                {teams.isLoading && <p style={{ margin: 0, fontSize: 13, color: 'var(--fg3)' }}>Loading…</p>}
                {!teams.isLoading && items.length === 0 && <div style={emptyState}>No teams yet.</div>}
                {items.length > 0 && (
                    <ul style={{ ...listCard, background: 'var(--panel)', listStyle: 'none', margin: 0, padding: 0 }}>
                        {items.map((team) => (
                            <li key={team.id} className="border-b border-border last:border-b-0">
                                <Link
                                    to={`/teams/${team.id}`}
                                    className="hover:bg-hover"
                                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', textDecoration: 'none', color: 'var(--fg)' }}
                                >
                                    {/* Two letters fit the tile; the full identifier is shown on the right. */}
                                    <TeamTile identifier={team.identifier.slice(0, 2)} color={team.color} size={30} />
                                    <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</span>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg3)' }}>{team.identifier}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}
