import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useProjects, useDeleteProject } from './hooks';
import { useMe } from '../../auth/useAuth';
import { canDevelop as canDevelopFor } from '../../auth/capabilities';
import { PROJECT_STATUS } from './projectStatus';
import { fmtDate } from './projectDetail';
import { DELETE_X_CLASSES, cardStyle, deleteXStyle, emptyState, pageCount } from './projectStyles';
import { PageHeader } from '../../components/PageHeader';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { avatarFor } from '../../lib/avatarFor';
import { ApiError } from '../../lib/apiClient';
import type { Project } from '../../lib/types';
import { useConfirm } from '../../components/ui/ConfirmProvider';

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
                <span style={pageCount}>{rows.length}</span>
            </PageHeader>

            <div style={{ padding: '4px 26px 40px' }}>
                {error && (
                    <div role="alert" style={{ margin: '0 0 12px', color: 'var(--red)', fontSize: 13 }}>
                        {error}
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

                        {rows.map((p) => {
                            const st = PROJECT_STATUS[p.status];
                            return (
                                <div
                                    key={p.id}
                                    data-testid={`project-row-${p.id}`}
                                    onClick={() => navigate(`/projects/${p.id}`)}
                                    // Separator + hover are classes (an inline background would beat hover:).
                                    className="border-b border-border last:border-b-0 hover:bg-hover"
                                    style={{ display: 'grid', gridTemplateColumns: COL, gap: 11, padding: '16px 20px', cursor: 'pointer', alignItems: 'center' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: 'var(--fg)', minWidth: 0 }}>
                                        <span style={{ width: 14, height: 14, borderRadius: 4, background: p.color, flexShrink: 0 }} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
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

                {rows.length === 0 && !projects.isLoading && (
                    <div style={emptyState}>No projects yet.</div>
                )}
            </div>
        </>
    );
}
