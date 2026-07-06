import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects, useDeleteProject } from './hooks';
import { useMe } from '../../auth/useAuth';
import { PROJECT_STATUS } from './projectStatus';
import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';
import { ApiError } from '../../lib/apiClient';
import type { Project } from '../../lib/types';
import { useConfirm } from '../../components/ui/ConfirmProvider';

function fmtDate(iso: string | null): string {
    if (!iso) return '—';
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const COL = 'minmax(180px,1fr) 150px 160px 180px 90px 54px 22px';

export default function ProjectsPage() {
    const navigate = useNavigate();
    const me = useMe();
    const canDevelop = !!me.data?.is_developer && me.data?.admin_level !== 'viewer';
    const projects = useProjects();
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
        <div style={{ padding: '0 0 80px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 26px 14px' }}>
                <h1 style={{ fontSize: 16, fontWeight: 600 }}>All projects</h1>
                <span style={{ fontSize: 12.5, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>{rows.length}</span>
                {canDevelop && (
                    <button
                        type="button"
                        onClick={() => navigate('/create?tab=project')}
                        style={{ marginLeft: 'auto', background: 'var(--accent)', color: '#fff', padding: '8px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer' }}
                    >
                        New project
                    </button>
                )}
            </div>
            {error && (
                <div role="alert" style={{ margin: '0 26px 12px', color: 'var(--red)', fontSize: 12.5 }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: COL, gap: 11, padding: '8px 26px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--fg3)' }}>
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
                        style={{ display: 'grid', gridTemplateColumns: COL, gap: 11, padding: '14px 26px', borderBottom: '1px solid var(--border)', cursor: 'pointer', alignItems: 'center' }}
                        className="hover:bg-hover"
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                            <span style={{ width: 14, height: 14, borderRadius: 4, background: p.color, flexShrink: 0 }} />
                            {p.name}
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--fg2)' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.color }} />
                            {st.label}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--fg2)' }}>
                            {p.lead
                                ? <><Avatar {...avatarFor(p.lead)} size={20} />{p.lead.name}</>
                                : <span style={{ color: 'var(--fg3)' }}>No lead</span>
                            }
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 110, height: 6, borderRadius: 4, background: 'var(--border2)', overflow: 'hidden' }}>
                                <div style={{ width: `${p.progress ?? 0}%`, height: '100%', background: p.color }} />
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg2)', width: 34 }}>
                                {p.progress ?? 0}%
                            </span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg2)' }}>
                            {fmtDate(p.target_date)}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg2)', textAlign: 'right' }}>
                            {p.issue_count ?? 0}
                        </div>
                        <div>
                            {canDevelop && (
                                <button
                                    type="button"
                                    aria-label={`Delete ${p.name}`}
                                    onClick={(e) => { e.stopPropagation(); remove(p); }}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--fg3)', fontSize: 14, cursor: 'pointer' }}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}

            {rows.length === 0 && !projects.isLoading && (
                <div style={{ padding: 24, color: 'var(--fg3)', fontSize: 13 }}>No projects yet.</div>
            )}
        </div>
    );
}
