import { Link, useNavigate } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { QueryState } from '../../components/ui/QueryState';
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
                <QueryState query={teams} what="teams">
                    {items.length === 0 && <div style={emptyState}>No teams yet.</div>}
                    {items.length > 0 && (
                        <ul style={{ ...listCard, background: 'var(--panel)', listStyle: 'none', margin: 0, padding: 0 }}>
                            {items.map((team) => (
                                <li key={team.id} className="border-b border-border last:border-b-0">
                                    <Link
                                        to={`/teams/${team.id}`}
                                        className="hover:bg-hover"
                                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', textDecoration: 'none', color: 'var(--fg)' }}
                                    >
                                        {/* The tile clips the key to what fits; its title carries the whole key. */}
                                        <TeamTile identifier={team.identifier} color={team.color} size={30} />
                                        <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</span>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg3)' }}>{team.identifier}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </QueryState>
            </div>
        </>
    );
}
