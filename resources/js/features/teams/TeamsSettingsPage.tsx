import { useState } from 'react';
import { useTeams } from './hooks';
import { TeamTile } from '../../components/ui/TeamTile';
import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';
import type { Team } from '../../lib/types';
import CreateTeamModal from './CreateTeamModal';
import TeamDrawer from './TeamDrawer';

export default function TeamsSettingsPage() {
    const teams = useTeams();
    const [createOpen, setCreateOpen] = useState(false);
    const [selected, setSelected] = useState<Team | null>(null);
    const rows = teams.data?.items ?? [];

    return (
        <div style={{ maxWidth: 1000, padding: '28px 24px 80px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
                <div>
                    <h1 style={{ fontSize: 21, fontWeight: 600 }}>Teams</h1>
                    <p style={{ fontSize: 13, color: 'var(--fg2)', maxWidth: 560 }}>
                        Create teams and manage their members and lead.
                    </p>
                </div>
                <button type="button" onClick={() => setCreateOpen(true)}
                    style={{ background: 'var(--accent)', color: '#fff', padding: '9px 15px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                    Create team
                </button>
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1.5fr) 90px 1fr', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--border)', fontSize: 10.5, textTransform: 'uppercase', fontWeight: 600, color: 'var(--fg3)' }}>
                    <span>Team</span><span>Members</span><span>Lead</span>
                </div>
                {rows.map((t, i) => (
                    <div key={t.id} data-testid={`team-row-${t.identifier}`} onClick={() => setSelected(t)}
                        style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1.5fr) 90px 1fr', gap: 12, padding: '12px 18px', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : undefined, cursor: 'pointer', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <TeamTile identifier={t.identifier} color={t.color} size={26} />
                            <div>
                                <div style={{ fontSize: 13 }}>{t.name}</div>
                                <div style={{ fontSize: 11.5, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>{t.identifier}</div>
                            </div>
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--fg2)' }}>{t.member_count ?? 0}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            {t.lead ? (
                                <>
                                    <Avatar {...avatarFor({ id: t.lead.id, name: t.lead.name })} size={20} />
                                    <span style={{ fontSize: 12.5 }}>{t.lead.name}</span>
                                </>
                            ) : <span style={{ fontSize: 12.5, color: 'var(--fg3)' }}>No lead</span>}
                        </div>
                    </div>
                ))}
                {rows.length === 0 && (
                    <div style={{ padding: 24, color: 'var(--fg3)', fontSize: 13 }}>No teams yet.</div>
                )}
            </div>

            <CreateTeamModal open={createOpen} onClose={() => setCreateOpen(false)} />
            <TeamDrawer team={selected} onClose={() => setSelected(null)} />
        </div>
    );
}
