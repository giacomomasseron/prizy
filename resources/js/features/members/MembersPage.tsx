import { useState, type CSSProperties } from 'react';
import { useMe } from '../../auth/useAuth';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { QueryState } from '../../components/ui/QueryState';
import { Menu } from '../../components/ui/Menu';
import { TeamTile } from '../../components/ui/TeamTile';
import { avatarFor } from '../../lib/avatarFor';
import { ApiError } from '../../lib/apiClient';
import { InviteModal } from './InviteModal';
import { LEVELS } from './levels';
import {
    useWorkspaceMembers,
    useUpdateMember,
    useRemoveMember,
    useCancelInvitation,
} from './workspaceHooks';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { DELETE_X_CLASSES, deleteXStyle } from '../projects/projectStyles';
import {
    ROW_SEP_CLASSES, alertBox, cardFrame, pageFrame, pageLead, pageTitle,
    statCard, statGrid, statLabel, statValue, tableHead, titleRow,
} from '../settings/settingsStyles';

// ─── styles ──────────────────────────────────────────────────────────────────

const MEMBER_COLS = 'minmax(150px,1.3fr) 108px 160px 62px 66px 22px';

/** Level trigger (mockup control). Its border colour lives in classes so the hover works. */
const levelBtn: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 9px', borderRadius: 8,
    borderWidth: 1, borderStyle: 'solid', background: 'transparent', fontSize: 11.5, fontWeight: 600,
    color: 'var(--fg)', fontFamily: 'inherit', whiteSpace: 'nowrap', cursor: 'pointer',
};
const levelDot: CSSProperties = { width: 8, height: 8, borderRadius: '50%', display: 'inline-block', flexShrink: 0 };

/** Capability chips (mockup capCss): every chip shows a currentColor dot. */
const capBase: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 7,
    fontSize: 11, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap', cursor: 'pointer',
};
const capOff: CSSProperties = { ...capBase, background: 'none', color: 'var(--fg3)', border: '1px dashed var(--border2)', opacity: 0.7 };
const devOnStyle: CSSProperties = { ...capBase, background: 'rgba(91,141,239,.16)', color: 'var(--blue-ink)', border: '1px solid transparent' };
const agentOnStyle: CSSProperties = { ...capBase, background: 'rgba(75,171,102,.16)', color: 'var(--green-ink)', border: '1px solid transparent' };
const capDot: CSSProperties = { width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 };

const ellipsis: CSSProperties = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const strong: CSSProperties = { color: 'var(--fg)', fontWeight: 600 };

// ─── component ────────────────────────────────────────────────────────────────

export default function MembersPage() {
    const [inviteOpen, setInviteOpen] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const me = useMe();
    const members = useWorkspaceMembers();
    const updateMember = useUpdateMember();
    const removeMember = useRemoveMember();
    const cancelInvitation = useCancelInvitation();
    const confirm = useConfirm();

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
                onActivate: () => {
                    setActionError(null);
                    updateMember.mutate(
                        { userId, data: { admin_level: key } },
                        {
                            onSuccess: () => setActionError(null),
                            onError: (e) => setActionError((e as ApiError).message),
                        },
                    );
                },
                disabled: updateMember.isPending,
            }));
    }

    return (
        <div style={{ ...pageFrame, minWidth: 728 }}>

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div style={titleRow}>
                <div>
                    <h1 style={pageTitle}><span className="hl">Members</span></h1>
                    <p style={pageLead}>
                        Manage who can access this workspace. Access is set by an administrative <b style={strong}>level</b> plus independent <b style={strong}>capabilities</b> for the Issue Tracker and Support modules.
                    </p>
                </div>
                <Button onClick={() => setInviteOpen(true)} style={{ marginLeft: 'auto', flexShrink: 0 }}>
                    Invite people
                </Button>
            </div>

            <QueryState query={members} what="members">
                {/* ── Stats grid ─────────────────────────────────────────────── */}
                <div style={statGrid}>
                    {(
                        [
                            { label: 'Total members', value: total,  testid: 'stat-total'  },
                            { label: 'Admins',         value: admins, testid: 'stat-admins' },
                            { label: 'Developers',     value: devs,   testid: 'stat-devs'  },
                            { label: 'Agents',         value: agents, testid: 'stat-agents' },
                        ] as const
                    ).map(stat => (
                        <div key={stat.label} style={statCard}>
                            <div style={statLabel}>{stat.label}</div>
                            <div data-testid={stat.testid} style={statValue}>{stat.value}</div>
                        </div>
                    ))}
                </div>

                {/* ── Action error banner ────────────────────────────────────── */}
                {actionError && (
                    <div
                        role="alert"
                        data-testid="action-error"
                        style={{
                            ...alertBox,
                            background: 'rgba(239,68,68,.08)',
                            border: '1px solid rgba(239,68,68,.3)',
                            marginBottom: 16,
                            color: 'var(--red-ink)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        <span>{actionError}</span>
                        <button
                            type="button"
                            onClick={() => setActionError(null)}
                            aria-label="Dismiss error"
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--red-ink)',
                                fontSize: 16,
                                lineHeight: 1,
                                padding: 0,
                                fontFamily: 'inherit',
                                flexShrink: 0,
                            }}
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* ── Table: no overflow on the card, so the level Menu can pop out of a row.
                     Below its min width the settings content pane scrolls sideways. ── */}
                <div data-testid="members-table" style={{ ...cardFrame, minWidth: 668 }}>

                    {/* Header row */}
                    <div style={{ ...tableHead, display: 'grid', gridTemplateColumns: MEMBER_COLS, gap: 12 }}>
                        <div>Member</div>
                        <div>Level</div>
                        <div>Capabilities</div>
                        <div>Teams</div>
                        <div>Status</div>
                        <div />
                    </div>

                    {/* Data rows */}
                    {rows.map((row) => {
                        const levelMeta = LEVELS[row.admin_level] ?? LEVELS.member;
                        const isInvited = row.status === 'invited';

                        return (
                            <div
                                key={row.id}
                                className={ROW_SEP_CLASSES}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: MEMBER_COLS,
                                    gap: 12,
                                    padding: '12px 18px',
                                    alignItems: 'center',
                                }}
                            >
                                {/* Member cell */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                                    <Avatar {...avatarFor(row)} size={30} title={row.name} />
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', ...ellipsis }}>
                                            {row.name}
                                        </div>
                                        <div style={{ fontSize: 11.5, color: 'var(--fg3)', ...ellipsis }}>
                                            {row.email}
                                        </div>
                                    </div>
                                </div>

                                {/* Level cell */}
                                <div style={{ minWidth: 0 }}>
                                    {!isInvited ? (
                                        <Menu
                                            trigger={
                                                <button
                                                    type="button"
                                                    data-testid={`level-btn-${row.email}`}
                                                    aria-label={`Level: ${levelMeta.label}`}
                                                    disabled={updateMember.isPending}
                                                    className="border-border enabled:hover:border-fg"
                                                    style={levelBtn}
                                                >
                                                    <span style={{ ...levelDot, background: levelMeta.color }} />
                                                    {levelMeta.label}
                                                    <span style={{ color: 'var(--fg3)', fontSize: 9 }}>▾</span>
                                                </button>
                                            }
                                            items={levelItems(row.id)}
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            disabled
                                            className="border-border"
                                            style={{ ...levelBtn, cursor: 'default', opacity: 0.6 }}
                                        >
                                            <span style={{ ...levelDot, background: levelMeta.color }} />
                                            {levelMeta.label}
                                        </button>
                                    )}
                                </div>

                                {/* Capabilities cell */}
                                <div style={{ display: 'flex', gap: 6, minWidth: 0 }}>
                                    {!isInvited ? (
                                        <>
                                            <button
                                                type="button"
                                                data-testid={`cap-developer-${row.email}`}
                                                aria-label="Developer"
                                                disabled={updateMember.isPending}
                                                onClick={() => {
                                                    setActionError(null);
                                                    updateMember.mutate(
                                                        { userId: row.id, data: { is_developer: !row.is_developer } },
                                                        {
                                                            onSuccess: () => setActionError(null),
                                                            onError: (e) => setActionError((e as ApiError).message),
                                                        },
                                                    );
                                                }}
                                                style={row.is_developer ? devOnStyle : capOff}
                                            >
                                                <span style={capDot} aria-hidden="true" />
                                                Dev
                                            </button>
                                            <button
                                                type="button"
                                                aria-label="Agent"
                                                disabled={updateMember.isPending}
                                                onClick={() => {
                                                    setActionError(null);
                                                    updateMember.mutate(
                                                        { userId: row.id, data: { is_agent: !row.is_agent } },
                                                        {
                                                            onSuccess: () => setActionError(null),
                                                            onError: (e) => setActionError((e as ApiError).message),
                                                        },
                                                    );
                                                }}
                                                style={row.is_agent ? agentOnStyle : capOff}
                                            >
                                                <span style={capDot} aria-hidden="true" />
                                                Agent
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <span style={{ ...(row.is_developer ? devOnStyle : capOff), cursor: 'default' }}>
                                                <span style={capDot} aria-hidden="true" />
                                                Dev
                                            </span>
                                            <span style={{ ...(row.is_agent ? agentOnStyle : capOff), cursor: 'default' }}>
                                                <span style={capDot} aria-hidden="true" />
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
                                            <TeamTile identifier={t.identifier} color={t.color} size={16} />
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
                                            <span style={{ color: 'var(--amber-ink)', fontSize: 12 }}>Invited</span>
                                        </>
                                    )}
                                </div>

                                {/* Remove cell — colour in DELETE_X_CLASSES so the red hover works; the name stays "×" */}
                                <div>
                                    <button
                                        type="button"
                                        data-testid={`remove-${row.email}`}
                                        disabled={!isInvited && removeMember.isPending && removeMember.variables === row.id}
                                        onClick={async () => {
                                            setActionError(null);
                                            if (isInvited) {
                                                cancelInvitation.mutate(row.id.replace('inv:', ''), {
                                                    onSuccess: () => setActionError(null),
                                                    onError: (e) => setActionError((e as ApiError).message),
                                                });
                                            } else {
                                                if (await confirm({ title: `Remove ${row.name}?`, danger: true })) {
                                                    removeMember.mutate(row.id, {
                                                        onSuccess: () => setActionError(null),
                                                        onError: (e) => setActionError((e as ApiError).message),
                                                    });
                                                }
                                            }
                                        }}
                                        className={DELETE_X_CLASSES}
                                        style={{ ...deleteXStyle, width: 24, height: 24, padding: 0 }}
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {/* ── No-access strip (inside the card, after the last row) ── */}
                    {showNoAccess && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '10px 18px',
                                fontSize: 12.5,
                                color: 'var(--amber-ink)',
                                background: 'rgba(224,161,58,.08)',
                                borderRadius: '0 0 16px 16px',
                            }}
                        >
                            ⚠ Members with no capability enabled have no access to any module.
                        </div>
                    )}
                </div>
            </QueryState>

            <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
        </div>
    );
}
