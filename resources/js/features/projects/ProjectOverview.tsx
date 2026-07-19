import { useMemo, useState } from 'react';
import { ApiError } from '../../lib/apiClient';
import { useMe } from '../../auth/useAuth';
import { useParams } from 'react-router-dom';
import { useProject, useMilestones, useCreateMilestone, useDeleteMilestone } from './hooks';
import { useIssues } from '../issues/hooks';
import type { Milestone } from '../../lib/types';
import { PROJECT_STATUS } from './projectStatus';
import { fmtDate, milestoneState, progressBreakdown, membersFromIssues } from './projectDetail';
import { MS_TAG, MS_ICON } from './milestoneMeta';
import { Avatar } from '../../components/ui/Avatar';
import { AvatarStack } from '../../components/ui/AvatarStack';
import { StatusIcon } from '../../components/ui/StatusIcon';
import { avatarFor } from '../../lib/avatarFor';
import { useConfirm } from '../../components/ui/ConfirmProvider';

export default function ProjectOverview() {
    const { id = '' } = useParams();
    const me = useMe();
    const canDevelop = !!me.data?.is_developer && me.data?.admin_level !== 'viewer';
    const project = useProject(id);
    const milestones = useMilestones(id);
    const issuesQ = useIssues({ project_id: id });
    const createMs = useCreateMilestone(id);
    const delMs = useDeleteMilestone(id);
    const confirm = useConfirm();

    const [msOpen, setMsOpen] = useState(false);
    const [msName, setMsName] = useState('');
    const [msDate, setMsDate] = useState('');
    const [error, setError] = useState<string | null>(null);

    const issues = useMemo(() => issuesQ.data?.items ?? [], [issuesQ.data]);
    const bd = progressBreakdown(issues);
    const members = membersFromIssues(issues);
    const p = project.data;
    if (!p) return null; // ProjectWorkspace already guards loading / not-found

    const st = PROJECT_STATUS[p.status];
    const total = p.issue_count ?? bd.total;
    const doneN = Math.round(((p.progress ?? 0) / 100) * total);
    const segs = [
        { key: 'done',       n: bd.done,       color: 'var(--accent)',  label: 'Done' },
        { key: 'inProgress', n: bd.inProgress, color: 'var(--amber)',   label: 'In progress' },
        { key: 'todo',       n: bd.todo,       color: 'var(--border2)', label: 'Todo' },
    ].filter((s) => s.n > 0);

    function submitMs(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        if (!msName.trim() || !msDate) return;
        createMs.mutate({ name: msName.trim(), target_date: msDate }, {
            onSuccess: () => { setMsName(''); setMsDate(''); setMsOpen(false); },
            onError: (err) => setError((err as ApiError).message),
        });
    }

    return (
        <>
            {/* Hero */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, background: p.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>{p.name.slice(0, 1).toUpperCase()}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-.02em' }}>{p.name}</h1>
                        <span data-testid="project-status-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '3px 10px', borderRadius: 20, background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 11.5, fontWeight: 600, color: 'var(--fg2)' }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.color }} />{st.label}
                        </span>
                    </div>
                    {p.description && <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--fg2)', lineHeight: 1.6, maxWidth: 680 }}>{p.description}</p>}
                </div>
            </div>

            {/* Meta rows */}
            <div style={{ display: 'flex', gap: 26, margin: '22px 0 4px', flexWrap: 'wrap' }}>
                <Meta label="Lead">{p.lead ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Avatar {...avatarFor(p.lead)} size={20} />{p.lead.name}</span> : <span style={{ color: 'var(--fg3)' }}>No lead</span>}</Meta>
                <Meta label="Target"><span style={{ fontFamily: 'var(--font-mono)' }}>{fmtDate(p.target_date)}</span></Meta>
                <Meta label="Start"><span style={{ fontFamily: 'var(--font-mono)' }}>{fmtDate(p.start_date)}</span></Meta>
                {members.length > 0 && (
                    <Meta label="Members"><span data-testid="members-stack"><AvatarStack avatars={members.map((m) => avatarFor(m))} size={20} max={4} /></span></Meta>
                )}
            </div>

            {/* Progress + Milestones grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, margin: '24px 0' }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', background: 'var(--panel)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600 }}>Progress</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--accent)' }}>{p.progress ?? 0}%</span>
                        <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>{doneN}/{total} issues</span>
                    </div>
                    <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', background: 'var(--bg2)', gap: 2 }}>
                        {segs.length === 0
                            ? <div data-testid="progress-empty" style={{ flexGrow: 1, background: 'var(--border2)', opacity: 0.5 }} />
                            : segs.map((s) => <div key={s.key} data-testid={`seg-${s.key}`} style={{ flexGrow: s.n, background: s.color, minWidth: 6 }} />)}
                    </div>
                    <div style={{ display: 'flex', gap: 18, marginTop: 14, flexWrap: 'wrap' }}>
                        {segs.map((s) => (<span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--fg2)' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />{s.label} · {s.n}</span>))}
                    </div>
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', background: 'var(--panel)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600 }}>Milestones</span>
                        {canDevelop && <button type="button" onClick={() => { setError(null); setMsOpen((o) => !o); }} aria-label="New milestone" style={{ marginLeft: 'auto', border: 'none', background: 'transparent', color: 'var(--fg3)', fontSize: 16, cursor: 'pointer' }}>+</button>}
                    </div>
                    {msOpen && canDevelop && (
                        <form onSubmit={submitMs} style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                            <input value={msName} onChange={(e) => setMsName(e.target.value)} placeholder="Milestone name" aria-label="Milestone name" style={{ flex: 1, border: '1px solid var(--border)', background: 'var(--bg2)', borderRadius: 8, padding: '6px 9px', color: 'var(--fg)', fontSize: 12.5 }} />
                            <input type="date" value={msDate} onChange={(e) => setMsDate(e.target.value)} aria-label="Milestone target date" style={{ border: '1px solid var(--border)', background: 'var(--bg2)', borderRadius: 8, padding: '6px', color: 'var(--fg)', fontSize: 12.5 }} />
                            <button type="submit" disabled={createMs.isPending} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '0 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Add</button>
                        </form>
                    )}
                    {error && <div role="alert" style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{error}</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                        {(milestones.data?.items ?? []).map((m: Milestone) => {
                            const state = milestoneState(m.target_date, new Date());
                            const tag = MS_TAG[state];
                            return (
                                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                                    <StatusIcon status={MS_ICON[state]} size={18} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{m.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--fg3)' }}>{fmtDate(m.target_date)}</div>
                                    </div>
                                    <span data-testid="milestone-tag" style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 9px', borderRadius: 20, whiteSpace: 'nowrap', color: tag.color, background: tag.bg }}>{tag.label}</span>
                                    {canDevelop && <button type="button" aria-label={`Delete ${m.name}`} onClick={async () => { setError(null); if (await confirm({ title: `Delete "${m.name}"?`, danger: true })) delMs.mutate(m.id, { onError: (e) => setError((e as ApiError).message) }); }} style={{ background: 'transparent', border: 'none', color: 'var(--fg3)', fontSize: 13, cursor: 'pointer' }}>×</button>}
                                </div>
                            );
                        })}
                        {(milestones.data?.items ?? []).length === 0 && <div style={{ fontSize: 12, color: 'var(--fg3)' }}>No milestones yet.</div>}
                    </div>
                </div>
            </div>
        </>
    );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 12, color: 'var(--fg3)' }}>{label}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--fg)', fontWeight: 500 }}>{children}</span>
        </div>
    );
}
