import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { canDevelop as canDevelopFor } from '../../auth/capabilities';
import { Button } from '../../components/ui/Button';
import { useDeleteCycle, useCycles, useTeams } from './hooks';
import { useConfirm } from '../../components/ui/ConfirmProvider';

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

    return (
        <div className="mx-auto max-w-3xl p-6">
            <Link to="/teams" className="text-sm text-accent">← Teams</Link>
            <h1 className="mt-2 text-xl font-semibold">{team ? `${team.identifier} · ${team.name}` : 'Team'}</h1>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
                <h2 className="font-semibold">Cycles</h2>
                {canDevelop && (
                    <Button onClick={() => navigate(`/create?tab=cycle&team=${id}`)}>New cycle</Button>
                )}
            </div>

            {cycles.isLoading && <p>Loading…</p>}
            <ul className="divide-y rounded border border-border bg-panel">
                {cycles.data?.items.map((c) => (
                    <li key={c.id} className="flex items-center justify-between px-4 py-2">
                        <span>{c.name} <span className="text-xs text-fg2">{c.starts_at} → {c.ends_at}</span></span>
                        {canDevelop && (
                            <button type="button" onClick={async () => { if (await confirm({ title: `Delete ${c.name}?`, danger: true })) del.mutate(c.id); }} className="text-sm text-red hover:underline">Delete</button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
