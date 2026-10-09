import { useState, type CSSProperties } from 'react';
import { useTeams } from './hooks';
import { TeamTile } from '../../components/ui/TeamTile';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { QueryState } from '../../components/ui/QueryState';
import { avatarFor } from '../../lib/avatarFor';
import type { Team } from '../../lib/types';
import CreateTeamModal from './CreateTeamModal';
import TeamDrawer from './TeamDrawer';
import { emptyState } from '../projects/projectStyles';
import { ROW_FOCUS_CLASSES, ROW_PRIMARY_CLASSES, rowPrimary } from '../../components/ui/rowPrimary';
import { ROW_CLASSES, listCard, pageFrame, pageLead, pageTitle, tableHead, titleRow } from '../settings/settingsStyles';

const TEAM_COLS = 'minmax(180px,1.5fr) 90px minmax(0,1fr) 20px';
const ellipsis: CSSProperties = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

export default function TeamsSettingsPage() {
    const teams = useTeams();
    const [createOpen, setCreateOpen] = useState(false);
    const [selected, setSelected] = useState<Team | null>(null);
    const rows = teams.data?.items ?? [];

    return (
        <div style={pageFrame}>
            <div style={titleRow}>
                <div>
                    <h1 style={pageTitle}><span className="hl">Teams</span></h1>
                    <p style={pageLead}>Create teams and manage their members and lead.</p>
                </div>
                <Button onClick={() => setCreateOpen(true)} style={{ marginLeft: 'auto', flexShrink: 0 }}>
                    Create team
                </Button>
            </div>

            <QueryState query={teams} what="teams">
                {rows.length > 0 ? (
                    <div style={{ ...listCard, marginTop: 22 }}>
                        <div style={{ ...tableHead, display: 'grid', gridTemplateColumns: TEAM_COLS, gap: 12 }}>
                            <span>Team</span><span>Members</span><span>Lead</span><span />
                        </div>
                        {rows.map((t) => (
                            <div key={t.id} data-testid={`team-row-${t.identifier}`} onClick={() => setSelected(t)} className={`${ROW_CLASSES} ${ROW_FOCUS_CLASSES}`}
                                style={{ display: 'grid', gridTemplateColumns: TEAM_COLS, gap: 12, padding: '14px 18px', alignItems: 'center', cursor: 'pointer' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                                    <TeamTile identifier={t.identifier} color={t.color} size={34} />
                                    <div style={{ minWidth: 0 }}>
                                        {/* The row's primary control (V2-G3b): its click bubbles to the row. */}
                                        <button type="button" className={ROW_PRIMARY_CLASSES} style={{ ...rowPrimary, display: 'block', maxWidth: '100%', fontSize: 13.5, fontWeight: 600, color: 'var(--fg)', ...ellipsis }}>{t.name}</button>
                                        <div style={{ fontSize: 11.5, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>{t.identifier}</div>
                                    </div>
                                </div>
                                <span style={{ fontSize: 12.5, color: 'var(--fg2)', fontFamily: 'var(--font-mono)' }}>{t.member_count ?? 0}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                                    {t.lead ? (
                                        <>
                                            <Avatar {...avatarFor({ id: t.lead.id, name: t.lead.name })} size={20} />
                                            <span style={{ fontSize: 12.5, color: 'var(--fg2)', ...ellipsis }}>{t.lead.name}</span>
                                        </>
                                    ) : <span style={{ fontSize: 12.5, color: 'var(--fg3)' }}>No lead</span>}
                                </div>
                                <span aria-hidden="true" style={{ color: 'var(--fg3)', textAlign: 'right' }}>›</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ ...emptyState, marginTop: 22 }}>No teams yet.</div>
                )}
            </QueryState>

            <CreateTeamModal open={createOpen} onClose={() => setCreateOpen(false)} />
            <TeamDrawer team={selected} onClose={() => setSelected(null)} />
        </div>
    );
}
