import { Link, useNavigate } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { useTeams } from './hooks';

export default function TeamsPage() {
    const me = useMe();
    const canManage = ['owner', 'admin'].includes(me.data?.admin_level ?? '');
    const teams = useTeams();
    const navigate = useNavigate();

    return (
        <div className="mx-auto max-w-4xl p-6">
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-xl font-semibold">Teams</h1>
                {canManage && (
                    <button type="button" onClick={() => navigate('/settings/teams')}
                        className="rounded bg-accent px-3 py-1 text-white text-sm">New team</button>
                )}
            </div>

            {teams.isLoading && <p>Loading…</p>}
            <ul className="divide-y rounded border border-border bg-panel">
                {teams.data?.items.map((team) => (
                    <li key={team.id} className="flex items-center px-4 py-2">
                        <Link to={`/teams/${team.id}`} className="font-medium hover:underline">
                            <span className="mr-2 rounded bg-hover px-1.5 py-0.5 text-xs">{team.identifier}</span>
                            {team.name}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
