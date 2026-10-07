import { useMemo, useState } from 'react';
import { ApiError } from '../../lib/apiClient';
import { useMe } from '../../auth/useAuth';
import { canDevelop as canDevelopFor } from '../../auth/capabilities';
import { useParams } from 'react-router-dom';
import { useProject, useMilestones, useCreateMilestone, useDeleteMilestone } from './hooks';
import { useIssues } from '../issues/hooks';
import type { Milestone } from '../../lib/types';
import { PROJECT_STATUS } from './projectStatus';
import { fmtDate, milestoneState, progressBreakdown, membersFromIssues } from './projectDetail';
import { MS_TAG, MS_ICON } from './milestoneMeta';
import { DELETE_X_CLASSES, cardStyle, deleteXStyle, tagPill } from './projectStyles';
import { ProjectBadge } from './ProjectBadge';
import { sectionTitle } from '../issues/issueStyles';
import { Avatar } from '../../components/ui/Avatar';
import { AvatarStack } from '../../components/ui/AvatarStack';
import { StatusIcon } from '../../components/ui/StatusIcon';
import { IconButton } from '../../components/ui/IconButton';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { avatarFor } from '../../lib/avatarFor';
import { useConfirm } from '../../components/ui/ConfirmProvider';

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 12.5 };

export default function ProjectOverview() {
    const { id = '' } = useParams();
    const me = useMe();
    const canDevelop = canDevelopFor(me.data);
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
        { key: 'done',       n: bd.done,       color: 'var(--green)',   label: 'Done' },
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
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
                <ProjectBadge name={p.name} color={p.color} size={60} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 40, letterSpacing: '-.035em', lineHeight: 1.05 }}>
                            <span className="hl">{p.name}</span>
                        </h1>
                        <span data-testid="project-status-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 12px', borderRadius: 'var(--radius-pill)', background: 'var(--panel)', border: 'var(--line) solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--fg2)' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.color }} />{st.label}
                        </span>
                    </div>
                    {p.description && <p style={{ margin: '12px 0 0', fontSize: 16.5, color: 'var(--fg2)', lineHeight: 1.6, maxWidth: 660 }}>{p.description}</p>}
                </div>
            </div>

            {/* Meta pills */}
            <div style={{ display: 'flex', gap: 10, margin: '26px 0 0', flexWrap: 'wrap' }}>
                <MetaPill label="Lead">{p.lead ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Avatar {...avatarFor(p.lead)} size={20} />{p.lead.name}</span> : <span style={{ color: 'var(--fg3)' }}>No lead</span>}</MetaPill>
                <MetaPill label="Target"><span style={mono}>{fmtDate(p.target_date)}</span></MetaPill>
                <MetaPill label="Start"><span style={mono}>{fmtDate(p.start_date)}</span></MetaPill>
                {members.length > 0 && (
                    <MetaPill label="Members"><span data-testid="members-stack"><AvatarStack avatars={members.map((m) => avatarFor(m))} size={20} max={4} /></span></MetaPill>
                )}
            </div>

            {/* Progress + Milestones */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginTop: 24 }}>
                <section style={{ ...cardStyle, padding: '22px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
                        <h2 style={sectionTitle(20)}>Progress</h2>
                        <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: 'var(--fg3)' }}>{doneN}/{total} issues</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 56, letterSpacing: '-.04em', lineHeight: 1, marginBottom: 16, color: 'var(--fg)' }}>{p.progress ?? 0}%</div>
                    <div style={{ display: 'flex', height: 14, borderRadius: 'var(--radius-pill)', overflow: 'hidden', background: 'var(--bg2)', gap: 3 }}>
                        {segs.length === 0
                            ? <div data-testid="progress-empty" style={{ flexGrow: 1, background: 'var(--border2)', opacity: 0.5 }} />
                            : segs.map((s) => <div key={s.key} data-testid={`seg-${s.key}`} style={{ flexGrow: s.n, background: s.color, minWidth: 8, borderRadius: 'var(--radius-pill)' }} />)}
                    </div>
                    <div style={{ display: 'flex', gap: 18, marginTop: 14, flexWrap: 'wrap' }}>
                        {segs.map((s) => (<span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: 'var(--fg2)' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />{s.label} · {s.n}</span>))}
                    </div>
                </section>

                <section style={{ ...cardStyle, padding: '22px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                        <h2 style={sectionTitle(20)}>Milestones</h2>
                        {canDevelop && (
                            <IconButton title="New milestone" onClick={() => { setError(null); setMsOpen((o) => !o); }} style={{ marginLeft: 'auto', fontSize: 18, color: 'var(--fg3)' }}>
                                +
                            </IconButton>
                        )}
                    </div>
                    {msOpen && canDevelop && (
                        <form onSubmit={submitMs} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                            <Input value={msName} onChange={(e) => setMsName(e.target.value)} placeholder="Milestone name" aria-label="Milestone name" style={{ flex: '1 1 160px', width: 'auto', padding: '7px 14px', fontSize: 13.5 }} />
                            <Input type="date" value={msDate} onChange={(e) => setMsDate(e.target.value)} aria-label="Milestone target date" style={{ width: 'auto', padding: '7px 12px', fontSize: 13.5 }} />
                            <Button variant="primary" size="sm" type="submit" disabled={createMs.isPending}>Add</Button>
                        </form>
                    )}
                    {error && <div role="alert" style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10 }}>{error}</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {(milestones.data?.items ?? []).map((m: Milestone) => {
                            const state = milestoneState(m.target_date, new Date());
                            const tag = MS_TAG[state];
                            return (
                                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <StatusIcon status={MS_ICON[state]} size={20} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--fg)' }}>{m.name}</div>
                                        <div style={{ ...mono, color: 'var(--fg3)' }}>{fmtDate(m.target_date)}</div>
                                    </div>
                                    <span data-testid="milestone-tag" style={{ ...tagPill, color: tag.color, background: tag.bg }}>{tag.label}</span>
                                    {canDevelop && (
                                        <button
                                            type="button"
                                            aria-label={`Delete ${m.name}`}
                                            onClick={async () => { setError(null); if (await confirm({ title: `Delete "${m.name}"?`, danger: true })) delMs.mutate(m.id, { onError: (e) => setError((e as ApiError).message) }); }}
                                            className={DELETE_X_CLASSES}
                                            style={deleteXStyle}
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                        {(milestones.data?.items ?? []).length === 0 && <div style={{ fontSize: 13.5, color: 'var(--fg3)' }}>No milestones yet.</div>}
                    </div>
                </section>
            </div>
        </>
    );
}

function MetaPill({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '7px 14px 7px 12px', borderRadius: 'var(--radius-pill)', background: 'var(--panel)', border: 'var(--line) solid var(--border)' }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg3)' }}>{label}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 700, color: 'var(--fg)' }}>{children}</span>
        </div>
    );
}
