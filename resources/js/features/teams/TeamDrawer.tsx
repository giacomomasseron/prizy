import { useState, type CSSProperties } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Menu } from '../../components/ui/Menu';
import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';
import { TeamTile } from '../../components/ui/TeamTile';
import { ApiError } from '../../lib/apiClient';
import type { Team } from '../../lib/types';
import { useTeams, useTeamMembers, useAddTeamMember, useSetTeamMemberRole, useRemoveTeamMember, useDeleteTeam, useUpdateTeam } from './hooks';
import { useWorkspaceMembers } from '../members/workspaceHooks';
import { ROLES } from './roles';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { DELETE_X_CLASSES, deleteXStyle } from '../projects/projectStyles';
import { DANGER_PILL_CLASSES, PILL_CLASSES, alertBox, groupLabel, pillBtn, swatchStyle } from '../settings/settingsStyles';

const EDIT_COLORS = ['#6366f1', '#e0a13a', '#4bab66', '#5b8def', '#eb5757', '#a855f7'];

/** Team role pill: colours in classes (a lead is accent-tinted; a member gets the ink hover). */
const rolePill: CSSProperties = {
    padding: '4px 11px', borderRadius: 'var(--radius-pill)', borderWidth: 'var(--line)', borderStyle: 'solid',
    fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
};
const ROLE_CLASSES = {
    lead: 'border-accent bg-accent2 text-accent-ink',
    member: 'border-border bg-transparent text-fg2 hover:border-fg',
} as const;

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
    const teamsQ = useTeams();

    if (!team) return <Drawer open={false} onClose={onClose}><span /></Drawer>;

    const live = teamsQ.data?.items.find((t) => t.id === team.id) ?? team;

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
                {/* Header: tile, editable display-font name over the mono identifier, round close */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <TeamTile identifier={live.identifier} color={live.color} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <input aria-label="Team name" defaultValue={live.name} key={`${live.id}-${live.name}-${live.color}`}
                            onBlur={(e) => commitName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
                            style={{ width: '100%', minWidth: 0, padding: 0, fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, letterSpacing: '-.02em', background: 'transparent', border: 'none', color: 'var(--fg)', outline: 'none' }} />
                        <div style={{ fontSize: 11.5, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>{live.identifier}</div>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="bg-transparent text-fg2 hover:bg-hover"
                        style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', fontSize: 18, lineHeight: 1, cursor: 'pointer', flexShrink: 0 }}>×</button>
                </div>
                <div style={{ display: 'flex', gap: 8, margin: '14px 0 18px' }}>
                    {EDIT_COLORS.map((c) => (
                        <button key={c} type="button" aria-label={`Set color ${c}`} aria-pressed={live.color === c}
                            onClick={() => { clear(); updateTeam.mutate({ id: team.id, color: c }, { onError: surface }); }}
                            style={swatchStyle(c, live.color === c, 22)} />
                    ))}
                </div>

                {error && (
                    <div role="alert" data-testid="team-drawer-error" style={{ ...alertBox, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.3)', marginBottom: 14, color: 'var(--red-ink)', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span>{error}</span>
                        <button type="button" aria-label="Dismiss error" onClick={clear} style={{ background: 'transparent', border: 'none', color: 'var(--red-ink)', cursor: 'pointer' }}>×</button>
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={groupLabel}>Members</span>
                    <Menu
                        placement="bottom-end"
                        trigger={<button type="button" aria-label="Add member" className={PILL_CLASSES} style={pillBtn}>+ Add member</button>}
                        items={addable.map((w) => ({
                            key: w.id,
                            label: w.name,
                            subtitle: w.email,
                            onActivate: () => { clear(); add.mutate({ user_id: w.id }, { onError: surface }); },
                        }))}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {(members.data ?? []).map((m) => (
                        <div key={m.id} data-testid={`team-member-${m.email}`} className="hover:bg-hover"
                            style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 8px', borderRadius: 'var(--radius-row)' }}>
                            <Avatar {...avatarFor({ id: m.id, name: m.name })} size={28} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{m.name}</div>
                                <div style={{ fontSize: 11.5, color: 'var(--fg3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                            </div>
                            <Menu
                                placement="bottom-end"
                                trigger={<button type="button" data-testid={`role-btn-${m.email}`} className={ROLE_CLASSES[m.role]} style={rolePill}>{ROLES[m.role].label} ▾</button>}
                                items={[
                                    { key: 'lead', label: 'Lead', onActivate: () => { clear(); setRole.mutate({ userId: m.id, role: 'lead' }, { onError: surface }); } },
                                    { key: 'member', label: 'Member', onActivate: () => { clear(); setRole.mutate({ userId: m.id, role: 'member' }, { onError: surface }); } },
                                ]}
                            />
                            <button type="button" data-testid={`remove-${m.email}`} aria-label={`Remove ${m.name}`} onClick={() => { clear(); remove.mutate(m.id, { onError: surface }); }}
                                className={DELETE_X_CLASSES} style={deleteXStyle}>×</button>
                        </div>
                    ))}
                    {(members.data ?? []).length === 0 && <div style={{ fontSize: 12.5, color: 'var(--fg3)', padding: '6px 4px' }}>No members yet.</div>}
                </div>

                <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <button type="button" aria-label="Delete team" onClick={async () => {
                        clear();
                        if (!(await confirm({ title: `Delete team ${team.name}?`, danger: true }))) return;
                        del.mutate(team.id, { onSuccess: () => onClose(), onError: surface });
                    }} className={DANGER_PILL_CLASSES} style={pillBtn}>
                        Delete team
                    </button>
                </div>
            </div>
        </Drawer>
    );
}
