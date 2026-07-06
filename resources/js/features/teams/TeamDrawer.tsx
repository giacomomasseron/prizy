import { useState } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Menu } from '../../components/ui/Menu';
import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';
import { TeamTile } from '../../components/ui/TeamTile';
import { ApiError } from '../../lib/apiClient';
import type { Team } from '../../lib/types';
import { useTeamMembers, useAddTeamMember, useSetTeamMemberRole, useRemoveTeamMember, useDeleteTeam, useUpdateTeam } from './hooks';
import { useWorkspaceMembers } from '../members/workspaceHooks';
import { ROLES } from './roles';
import { useConfirm } from '../../components/ui/ConfirmProvider';

const EDIT_COLORS = ['#6366f1', '#e0a13a', '#4bab66', '#5b8def', '#eb5757', '#a855f7'];

export default function TeamDrawer({ team, onClose }: { team: Team | null; onClose(): void }) {
    const open = team !== null;
    const teamId = team?.id ?? '';
    const [error, setError] = useState<string | null>(null);

    const confirm = useConfirm();
    const members = useTeamMembers(teamId, { enabled: open });
    const workspace = useWorkspaceMembers({ enabled: open });
    const add = useAddTeamMember(teamId);
    const setRole = useSetTeamMemberRole(teamId);
    const remove = useRemoveTeamMember(teamId);
    const del = useDeleteTeam();
    const updateTeam = useUpdateTeam();

    if (!team) return <Drawer open={false} onClose={onClose}><span /></Drawer>;

    const memberIds = new Set((members.data ?? []).map((m) => m.id));
    const addable = (workspace.data ?? []).filter((w) => w.status === 'active' && !memberIds.has(w.id));

    function surface(e: unknown) { setError((e as ApiError).message); }
    function clear() { setError(null); }
    function commitName(value: string) {
        const name = value.trim();
        if (!name || name === team!.name) return;
        clear();
        updateTeam.mutate({ id: team!.id, name }, { onError: surface });
    }

    return (
        <Drawer open={open} onClose={onClose} width={520}>
            <div style={{ padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <TeamTile identifier={team.identifier} color={team.color} size={30} />
                    <input aria-label="Team name" defaultValue={team.name} key={team.id}
                        onBlur={(e) => commitName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
                        style={{ flex: 1, minWidth: 0, fontSize: 17, fontWeight: 600, background: 'transparent', border: 'none', color: 'var(--fg)', outline: 'none' }} />
                    <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', color: 'var(--fg3)', fontSize: 18, cursor: 'pointer' }}>×</button>
                </div>
                <div style={{ display: 'flex', gap: 7, marginBottom: 18 }}>
                    {EDIT_COLORS.map((c) => (
                        <button key={c} type="button" aria-label={`Set color ${c}`}
                            onClick={() => { clear(); updateTeam.mutate({ id: team.id, color: c }, { onError: surface }); }}
                            style={{ width: 20, height: 20, borderRadius: 5, background: c, border: team.color === c ? '2px solid var(--fg)' : '2px solid transparent', cursor: 'pointer' }} />
                    ))}
                </div>

                {error && (
                    <div role="alert" data-testid="team-drawer-error" style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 9, padding: '10px 14px', marginBottom: 14, color: 'var(--red)', fontSize: 13, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span>{error}</span>
                        <button type="button" aria-label="Dismiss error" onClick={clear} style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer' }}>×</button>
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 10.5, textTransform: 'uppercase', fontWeight: 600, color: 'var(--fg3)' }}>Members</span>
                    <Menu
                        trigger={<button type="button" aria-label="Add member" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', fontSize: 12, background: 'transparent', color: 'var(--fg)', cursor: 'pointer' }}>+ Add member</button>}
                        items={addable.map((w) => ({
                            key: w.id,
                            label: w.name,
                            subtitle: w.email,
                            onActivate: () => { clear(); add.mutate({ user_id: w.id }, { onError: surface }); },
                        }))}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(members.data ?? []).map((m) => (
                        <div key={m.id} data-testid={`team-member-${m.email}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 4px' }}>
                            <Avatar {...avatarFor({ id: m.id, name: m.name })} size={26} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13 }}>{m.name}</div>
                                <div style={{ fontSize: 11.5, color: 'var(--fg3)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</div>
                            </div>
                            <Menu
                                trigger={<button type="button" data-testid={`role-btn-${m.email}`} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '4px 9px', fontSize: 11.5, background: 'transparent', color: ROLES[m.role].color, cursor: 'pointer' }}>{ROLES[m.role].label} ▾</button>}
                                items={[
                                    { key: 'lead', label: 'Lead', onActivate: () => { clear(); setRole.mutate({ userId: m.id, role: 'lead' }, { onError: surface }); } },
                                    { key: 'member', label: 'Member', onActivate: () => { clear(); setRole.mutate({ userId: m.id, role: 'member' }, { onError: surface }); } },
                                ]}
                            />
                            <button type="button" data-testid={`remove-${m.email}`} aria-label={`Remove ${m.name}`} onClick={() => { clear(); remove.mutate(m.id, { onError: surface }); }}
                                style={{ background: 'transparent', border: 'none', color: 'var(--fg3)', fontSize: 14, cursor: 'pointer' }}>×</button>
                        </div>
                    ))}
                    {(members.data ?? []).length === 0 && <div style={{ fontSize: 12.5, color: 'var(--fg3)', padding: '6px 4px' }}>No members yet.</div>}
                </div>

                <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <button type="button" aria-label="Delete team" onClick={async () => {
                        clear();
                        if (!(await confirm({ title: `Delete team ${team.name}?`, danger: true }))) return;
                        del.mutate(team.id, { onSuccess: () => onClose(), onError: surface });
                    }} style={{ color: 'var(--red)', background: 'transparent', border: '1px solid rgba(239,68,68,.3)', borderRadius: 9, padding: '8px 14px', fontSize: 12.5, cursor: 'pointer' }}>
                        Delete team
                    </button>
                </div>
            </div>
        </Drawer>
    );
}
