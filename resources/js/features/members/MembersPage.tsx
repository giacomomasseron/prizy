import { useState } from 'react';
import { useMe } from '../../auth/useAuth';
import { Avatar } from '../../components/ui/Avatar';
import { Menu } from '../../components/ui/Menu';
import { TeamTile } from '../../components/ui/TeamTile';
import { avatarFor } from '../../lib/avatarFor';
import { LEVELS } from './levels';
import {
    useWorkspaceMembers,
    useUpdateMember,
    useRemoveMember,
    useCancelInvitation,
} from './workspaceHooks';

// ─── chip styles ─────────────────────────────────────────────────────────────

const chipBase: React.CSSProperties = {
    borderRadius: 7,
    padding: '4px 9px',
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
};

const devOnStyle: React.CSSProperties = {
    ...chipBase,
    background: 'rgba(91,141,239,.16)',
    color: 'var(--blue)',
    border: '1px solid transparent',
};

const devOffStyle: React.CSSProperties = {
    ...chipBase,
    background: 'none',
    color: 'var(--fg3)',
    border: '1px dashed var(--border2)',
    opacity: 0.7,
};

const agentOnStyle: React.CSSProperties = {
    ...chipBase,
    background: 'rgba(75,171,102,.16)',
    color: 'var(--green)',
    border: '1px solid transparent',
};

const agentOffStyle: React.CSSProperties = {
    ...chipBase,
    background: 'none',
    color: 'var(--fg3)',
    border: '1px dashed var(--border2)',
    opacity: 0.7,
};

// ─── component ────────────────────────────────────────────────────────────────

export default function MembersPage() {
    const [_inviteOpen, setInviteOpen] = useState(false);

    const me = useMe();
    const members = useWorkspaceMembers();
    const updateMember = useUpdateMember();
    const removeMember = useRemoveMember();
    const cancelInvitation = useCancelInvitation();

    const isOwner = me.data?.admin_level === 'owner';
    const rows = members.data ?? [];

    // Stats
    const total = rows.length;
    const admins = rows.filter(r => r.admin_level === 'owner' || r.admin_level === 'admin').length;
    const devs = rows.filter(r => r.is_developer).length;
    const agents = rows.filter(r => r.is_agent).length;

    // No-access banner: show when any active member-level user has no capabilities
    const showNoAccess = rows.some(
        r => r.status === 'active' && r.admin_level === 'member' && !r.is_developer && !r.is_agent,
    );

    // Level menu items (filtered by isOwner)
    function levelItems(userId: string) {
        return (Object.entries(LEVELS) as [keyof typeof LEVELS, typeof LEVELS[keyof typeof LEVELS]][])
            .filter(([key]) => key !== 'owner' || isOwner)
            .map(([key, meta]) => ({
                key,
                label: meta.label,
                subtitle: meta.desc,
                icon: (
                    <span
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: meta.color,
                            display: 'inline-block',
                        }}
                    />
                ),
                onActivate: () => updateMember.mutate({ userId, data: { admin_level: key } }),
                disabled: updateMember.isPending,
            }));
    }

    return (
        <div style={{ maxWidth: 1000, padding: '28px 24px 80px' }}>

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 22,
                }}
            >
                <div>
                    <h1 style={{ fontSize: 21, fontWeight: 600, margin: 0 }}>Members</h1>
                    <p style={{ fontSize: 13, color: 'var(--fg2)', maxWidth: 560, margin: '4px 0 0' }}>
                        Manage workspace members, their roles, and module capabilities.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setInviteOpen(true)}
                    style={{
                        background: 'var(--accent)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 9,
                        padding: '9px 15px',
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        flexShrink: 0,
                    }}
                >
                    Invite people
                </button>
            </div>

            {/* ── Stats grid ─────────────────────────────────────────────── */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 12,
                    marginBottom: 22,
                }}
            >
                {(
                    [
                        { label: 'Total members', value: total,  testid: 'stat-total'  },
                        { label: 'Admins',         value: admins, testid: 'stat-admins' },
                        { label: 'Developers',     value: devs,   testid: 'stat-devs'  },
                        { label: 'Agents',         value: agents, testid: 'stat-agents' },
                    ] as const
                ).map(stat => (
                    <div
                        key={stat.label}
                        style={{
                            border: '1px solid var(--border)',
                            borderRadius: 11,
                            padding: '13px 15px',
                        }}
                    >
                        <div
                            style={{
                                fontSize: 10.5,
                                textTransform: 'uppercase',
                                fontWeight: 600,
                                color: 'var(--fg3)',
                                marginBottom: 4,
                            }}
                        >
                            {stat.label}
                        </div>
                        <div
                            data-testid={stat.testid}
                            style={{ fontSize: 22, fontWeight: 600 }}
                        >
                            {stat.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── No-access banner ───────────────────────────────────────── */}
            {showNoAccess && (
                <div
                    style={{
                        background: 'rgba(224,161,58,.08)',
                        border: '1px solid rgba(224,161,58,.3)',
                        borderRadius: 9,
                        padding: '10px 14px',
                        marginBottom: 16,
                        color: 'var(--amber)',
                        fontSize: 13,
                    }}
                >
                    ⚠ Members with no capability enabled have no access to any module.
                </div>
            )}

            {/* ── Table ──────────────────────────────────────────────────── */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 13 }}>

                {/* Header row */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(150px,1.3fr) 108px 160px 62px 66px 22px',
                        gap: 12,
                        padding: '10px 18px',
                        fontSize: 10.5,
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        color: 'var(--fg3)',
                    }}
                >
                    <div>Member</div>
                    <div>Level</div>
                    <div>Capabilities</div>
                    <div>Teams</div>
                    <div>Status</div>
                    <div />
                </div>

                {/* Data rows */}
                {rows.map((row, i) => {
                    const levelMeta = LEVELS[row.admin_level] ?? LEVELS.member;
                    const isInvited = row.status === 'invited';

                    return (
                        <div
                            key={row.id}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(150px,1.3fr) 108px 160px 62px 66px 22px',
                                gap: 12,
                                padding: '10px 18px',
                                alignItems: 'center',
                                borderTop: '1px solid var(--border)',
                            }}
                        >
                            {/* Member cell */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                                <Avatar {...avatarFor(row)} size={30} title={row.name} />
                                <div style={{ overflow: 'hidden' }}>
                                    <div
                                        style={{
                                            fontSize: 13,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {row.name}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 11.5,
                                            color: 'var(--fg3)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {row.email}
                                    </div>
                                </div>
                            </div>

                            {/* Level cell */}
                            <div>
                                {!isInvited ? (
                                    <Menu
                                        trigger={
                                            <button
                                                type="button"
                                                aria-label={`Level: ${levelMeta.label}`}
                                                disabled={updateMember.isPending}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 5,
                                                    border: '1px solid var(--border)',
                                                    borderRadius: 8,
                                                    padding: '5px 9px',
                                                    fontSize: 11.5,
                                                    background: 'none',
                                                    cursor: 'pointer',
                                                    fontFamily: 'inherit',
                                                    color: 'var(--fg)',
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: '50%',
                                                        background: levelMeta.color,
                                                        display: 'inline-block',
                                                        flexShrink: 0,
                                                    }}
                                                />
                                                {levelMeta.label}
                                                <span style={{ fontSize: 9 }}>▾</span>
                                            </button>
                                        }
                                        items={levelItems(row.id)}
                                    />
                                ) : (
                                    <button
                                        type="button"
                                        disabled
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 5,
                                            border: '1px solid var(--border)',
                                            borderRadius: 8,
                                            padding: '5px 9px',
                                            fontSize: 11.5,
                                            background: 'none',
                                            cursor: 'default',
                                            fontFamily: 'inherit',
                                            color: 'var(--fg)',
                                            opacity: 0.6,
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                background: levelMeta.color,
                                                display: 'inline-block',
                                                flexShrink: 0,
                                            }}
                                        />
                                        {levelMeta.label}
                                    </button>
                                )}
                            </div>

                            {/* Capabilities cell */}
                            <div style={{ display: 'flex', gap: 5 }}>
                                {!isInvited ? (
                                    <>
                                        <button
                                            type="button"
                                            aria-label="Developer"
                                            onClick={() =>
                                                updateMember.mutate({
                                                    userId: row.id,
                                                    data: { is_developer: !row.is_developer },
                                                })
                                            }
                                            style={row.is_developer ? devOnStyle : devOffStyle}
                                        >
                                            {row.is_developer && (
                                                <span
                                                    style={{
                                                        width: 6,
                                                        height: 6,
                                                        borderRadius: '50%',
                                                        background: 'var(--blue)',
                                                        display: 'inline-block',
                                                    }}
                                                />
                                            )}
                                            Dev
                                        </button>
                                        <button
                                            type="button"
                                            aria-label="Agent"
                                            onClick={() =>
                                                updateMember.mutate({
                                                    userId: row.id,
                                                    data: { is_agent: !row.is_agent },
                                                })
                                            }
                                            style={row.is_agent ? agentOnStyle : agentOffStyle}
                                        >
                                            {row.is_agent && (
                                                <span
                                                    style={{
                                                        width: 6,
                                                        height: 6,
                                                        borderRadius: '50%',
                                                        background: 'var(--green)',
                                                        display: 'inline-block',
                                                    }}
                                                />
                                            )}
                                            Agent
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <span style={row.is_developer ? { ...devOnStyle, cursor: 'default' } : { ...devOffStyle, cursor: 'default' }}>
                                            Dev
                                        </span>
                                        <span style={row.is_agent ? { ...agentOnStyle, cursor: 'default' } : { ...agentOffStyle, cursor: 'default' }}>
                                            Agent
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Teams cell */}
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'nowrap' }}>
                                {row.teams.slice(0, 3).map(t => (
                                    <span
                                        key={t.id}
                                        style={{ borderRadius: 5, overflow: 'hidden', display: 'inline-flex', flexShrink: 0 }}
                                    >
                                        <TeamTile identifier={t.identifier.slice(0, 2)} color={t.color} size={16} />
                                    </span>
                                ))}
                                {row.teams.length > 3 && (
                                    <span style={{ color: 'var(--fg3)', fontSize: 11 }}>
                                        +{row.teams.length - 3}
                                    </span>
                                )}
                            </div>

                            {/* Status cell */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                {row.status === 'active' ? (
                                    <>
                                        <span
                                            style={{
                                                width: 7,
                                                height: 7,
                                                borderRadius: '50%',
                                                background: 'var(--green)',
                                                display: 'inline-block',
                                                flexShrink: 0,
                                            }}
                                        />
                                        <span style={{ color: 'var(--fg2)', fontSize: 12 }}>Active</span>
                                    </>
                                ) : (
                                    <>
                                        <span
                                            style={{
                                                width: 7,
                                                height: 7,
                                                borderRadius: '50%',
                                                background: 'var(--amber)',
                                                display: 'inline-block',
                                                flexShrink: 0,
                                            }}
                                        />
                                        <span style={{ color: 'var(--amber)', fontSize: 12 }}>Invited</span>
                                    </>
                                )}
                            </div>

                            {/* Remove cell */}
                            <div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isInvited) {
                                            cancelInvitation.mutate(row.id.replace('inv:', ''));
                                        } else {
                                            if (window.confirm(`Remove ${row.name}?`)) {
                                                removeMember.mutate(row.id);
                                            }
                                        }
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: 14,
                                        color: 'var(--fg3)',
                                        padding: 0,
                                        fontFamily: 'inherit',
                                        lineHeight: 1,
                                    }}
                                    className="hover:text-[var(--red)]"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* TODO(Task 6): <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} /> */}
        </div>
    );
}
