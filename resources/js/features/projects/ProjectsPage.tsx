import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAllMyProjects, useProjects, useDeleteProject } from './hooks';
import { useMe } from '../../auth/useAuth';
import { canDevelop as canDevelopFor } from '../../auth/capabilities';
import { PROJECT_STATUS } from './projectStatus';
import { fmtDate } from './projectDetail';
import { DELETE_X_CLASSES, cardStyle, deleteXStyle, emptyState, pageCount } from './projectStyles';
import { PageHeader } from '../../components/PageHeader';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { QueryState } from '../../components/ui/QueryState';
import { avatarFor } from '../../lib/avatarFor';
import { ApiError } from '../../lib/apiClient';
import type { Project, ProjectStatus } from '../../lib/types';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { chipClasses, chipStyle } from '../issues/issueStyles';
import { ROW_FOCUS_CLASSES, ROW_PRIMARY_CLASSES, onRowLinkClick, rowPrimary } from '../../components/ui/rowPrimary';

const COL = 'minmax(180px,1fr) 150px 160px 180px 90px 54px 22px';
const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg2)' };

export default function ProjectsPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const teamId = searchParams.get('team_id') ?? undefined;
    const me = useMe();
    const canDevelop = canDevelopFor(me.data);
    const projects = useProjects(teamId ? { team_id: teamId } : undefined);
    const del = useDeleteProject();
    const confirm = useConfirm();
    const [error, setError] = useState<string | null>(null);
    const rows = projects.data?.items ?? [];

    // The filter chips (the Workspace design): All, Mine, then one per status these projects have.
    const [picked, setPicked] = useState<'all' | 'mine' | ProjectStatus>('all');
    const mine = useAllMyProjects(teamId);
    const mineIds = new Set((mine.data?.items ?? []).map((p) => p.id));
    const chips: Array<{ key: typeof picked; label: string; keeps: (p: Project) => boolean }> = [
        { key: 'all', label: 'All', keeps: () => true },
        { key: 'mine', label: 'Mine', keeps: (p) => mineIds.has(p.id) },
        ...(Object.keys(PROJECT_STATUS) as ProjectStatus[])
            .filter((status) => rows.some((p) => p.status === status))
            .map((status) => ({ key: status, label: PROJECT_STATUS[status].label, keeps: (p: Project) => p.status === status })),
    ];
    // A status chip goes away with its last project: fall back to All.
    const chip = chips.find((c) => c.key === picked) ?? chips[0];
    const shown = rows.filter(chip.keeps);

    async function remove(p: Project) {
        setError(null);
        if (!(await confirm({ title: `Delete ${p.name}?`, danger: true }))) return;
        del.mutate(p.id, { onError: (e) => setError((e as ApiError).message) });
    }

    return (
        <>
            <PageHeader
                title="All projects"
                actions={canDevelop ? <Button variant="primary" onClick={() => navigate('/create?tab=project')}>New project</Button> : undefined}
            >
                {projects.data !== undefined && <span data-testid="projects-count" style={pageCount}>{shown.length}</span>}
            </PageHeader>

            <div style={{ padding: '4px 26px 40px' }}>
                {error && (
                    <div role="alert" style={{ margin: '0 0 12px', color: 'var(--red-ink)', fontSize: 13 }}>
                        {error}
                    </div>
                )}

                <QueryState query={projects} what="projects">
                    {rows.length > 0 && (
                        <div role="group" aria-label="Filter projects" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '0 4px 16px' }}>
                            {chips.map((c) => (
                                <button key={c.key} type="button" aria-pressed={c === chip} onClick={() => setPicked(c.key)} className={chipClasses(c === chip)} style={chipStyle}>
                                    {c.label}<span style={{ marginLeft: 6, opacity: 0.6, fontSize: 12 }}>{rows.filter(c.keeps).length}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {rows.length > 0 && (
                        <div style={{ ...cardStyle, borderRadius: 18, overflowX: 'auto' }}>
                            <div style={{ minWidth: 942 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: COL, gap: 11, padding: '12px 20px', background: 'var(--bg2)', borderBottom: 'var(--line) solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--fg3)' }}>
                                <span>Project</span>
                                <span>Status</span>
                                <span>Lead</span>
                                <span>Progress</span>
                                <span>Target</span>
                                <span style={{ textAlign: 'right' }}>Issues</span>
                                <span />
                            </div>

                            {shown.length === 0 && <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--fg3)', fontSize: 14 }}>No projects match this filter.</div>}

                            {shown.map((p) => {
                                const st = PROJECT_STATUS[p.status];
                                return (
                                    <div
                                        key={p.id}
                                        data-testid={`project-row-${p.id}`}
                                        onClick={() => navigate(`/projects/${p.id}`)}
                                        // Separator + hover are classes (an inline background would beat hover:).
                                        className={`border-b border-border last:border-b-0 hover:bg-hover ${ROW_FOCUS_CLASSES}`}
                                        style={{ display: 'grid', gridTemplateColumns: COL, gap: 11, padding: '16px 20px', cursor: 'pointer', alignItems: 'center' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: 'var(--fg)', minWidth: 0 }}>
                                            <span style={{ width: 14, height: 14, borderRadius: 4, background: p.color, flexShrink: 0 }} />
                                            {/* The row's primary control (V2-G3b): a link, so it opens in a new tab too. */}
                                            <Link to={`/projects/${p.id}`} onClick={onRowLinkClick} className={ROW_PRIMARY_CLASSES} style={{ ...rowPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</Link>
                                        </div>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--fg2)' }}>
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.color }} />
                                            {st.label}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fg2)' }}>
                                            {p.lead
                                                ? <><Avatar {...avatarFor(p.lead)} size={20} />{p.lead.name}</>
                                                : <span style={{ color: 'var(--fg3)' }}>No lead</span>
                                            }
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 110, height: 8, borderRadius: 'var(--radius-pill)', background: 'var(--bg2)', overflow: 'hidden' }}>
                                                <div style={{ width: `${p.progress ?? 0}%`, height: '100%', background: p.color, borderRadius: 'var(--radius-pill)' }} />
                                            </div>
                                            <span style={{ ...mono, fontSize: 11.5, width: 38 }}>
                                                {p.progress ?? 0}%
                                            </span>
                                        </div>
                                        <div style={mono}>
                                            {fmtDate(p.target_date)}
                                        </div>
                                        <div style={{ ...mono, textAlign: 'right' }}>
                                            {p.issue_count ?? 0}
                                        </div>
                                        <div>
                                            {canDevelop && (
                                                <button
                                                    type="button"
                                                    aria-label={`Delete ${p.name}`}
                                                    onClick={(e) => { e.stopPropagation(); remove(p); }}
                                                    className={DELETE_X_CLASSES}
                                                    style={deleteXStyle}
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            </div>
                        </div>
                    )}

                    {rows.length === 0 && (
                        <div style={emptyState}>No projects yet.</div>
                    )}
                </QueryState>
            </div>
        </>
    );
}
