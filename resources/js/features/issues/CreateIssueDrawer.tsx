import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { IconButton } from '../../components/ui/IconButton';
import { Button } from '../../components/ui/Button';
import { Menu } from '../../components/ui/Menu';
import { StatusIcon } from '../../components/ui/StatusIcon';
import { PriorityIcon } from '../../components/ui/PriorityIcon';
import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';
import { useTeams } from '../teams/hooks';
import { useProjects } from '../projects/hooks';
import { useReleases } from '../releases/hooks';
import { useMembers } from '../members/hooks';
import { useLabels } from '../labels/hooks';
import { useCreateIssue } from './hooks';
import { PRIORITY_LABELS, STATUS_LABELS } from './issueMeta';
import { chipClasses, chipStyle } from './issueStyles';
import type { IssueStatus, IssuePriority } from '../../lib/types';

export interface CreateIssueDrawerProps {
    open: boolean;
    initialStatus?: IssueStatus | null;
    onClose(): void;
}

// New-issue statuses (Done and Cancelled excluded — you don't file a new issue as done).
const NEW_ISSUE_STATUSES: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'in_review'];
const STATUS_OPTIONS = NEW_ISSUE_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }));

const NEW_ISSUE_PRIORITIES: IssuePriority[] = ['urgent', 'high', 'medium', 'low', 'no_priority'];
const PRIORITY_OPTIONS = NEW_ISSUE_PRIORITIES.map((value) => ({ value, label: PRIORITY_LABELS[value] }));

const rowLabel: CSSProperties = { width: 74, flexShrink: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--fg3)', paddingTop: 6 };

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={rowLabel}>{label}</span>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', minWidth: 0 }}>{children}</div>
        </div>
    );
}

function labelDot(color: string) {
    return <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />;
}

function projectSwatch(color: string) {
    return <span style={{ width: 9, height: 9, borderRadius: 3, background: color, flexShrink: 0 }} />;
}

export function CreateIssueDrawer({ open, initialStatus, onClose }: CreateIssueDrawerProps) {
    const teams = useTeams();
    const projects = useProjects(undefined, { enabled: open });
    // Non-paginated api.get (an array directly, not `{ items }`) — matches how the Project
    // chip's list-hook fetch is gated to only while the drawer is open.
    const releases = useReleases({ enabled: open });
    const members = useMembers();
    const labels = useLabels({ enabled: open });
    const createIssue = useCreateIssue();

    const [teamId, setTeamId] = useState<string | null>(null);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [releaseId, setReleaseId] = useState<string | null>(null);
    const [assigneeId, setAssigneeId] = useState<string | null>(null);
    const [labelIds, setLabelIds] = useState<string[]>([]);
    const [title, setTitle] = useState('');
    const [status, setStatus] = useState<IssueStatus>(initialStatus ?? 'todo');
    const [priority, setPriority] = useState<IssuePriority>('no_priority');
    const [description, setDescription] = useState('');

    // Auto-select when there is exactly one team
    useEffect(() => {
        if (teams.data?.items?.length === 1) {
            setTeamId(teams.data.items[0].id);
        }
    }, [teams.data]);

    function resetFields() {
        setTitle('');
        setStatus(initialStatus ?? 'todo');
        setPriority('no_priority');
        setDescription('');
        setProjectId(null);
        setReleaseId(null);
        setAssigneeId(null);
        setLabelIds([]);
    }

    // Reset form fields each time the drawer opens
    useEffect(() => {
        if (open) resetFields();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, initialStatus]);

    const teamList = teams.data?.items ?? [];
    const selectedTeam = teamList.find((t) => t.id === teamId);
    const singleTeam = teamList.length === 1;
    const projectList = projects.data?.items ?? [];
    const releaseList = releases.data ?? [];
    const memberList = members.data ?? [];
    const selectedMember = memberList.find((m) => m.id === assigneeId);
    const labelList = labels.data?.items ?? [];
    const canSubmit = !!teamId && !!title.trim() && !createIssue.isPending;

    function toggleLabel(id: string) {
        setLabelIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    }

    async function submit(keepOpen: boolean) {
        if (!teamId || !title.trim()) return;
        try {
            await createIssue.mutateAsync({
                team_id: teamId,
                title: title.trim(),
                status,
                priority,
                assignee_id: assigneeId,
                description: description.trim() || null,
                project_id: projectId,
                label_ids: labelIds,
                // Unlike project_id, release_id is only sent when a release is actually picked
                // (no "unset" release concept to force onto every create).
                ...(releaseId ? { release_id: releaseId } : {}),
            });
            if (keepOpen) resetFields();
            else onClose();
        } catch {
            // inline error handling arrives with a later slice
        }
    }

    return (
        <Drawer open={open} onClose={onClose} side="right" width={520}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <span aria-hidden="true" style={{ width: 17, height: 17, borderRadius: 5, background: 'var(--accent)', color: 'var(--on-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, lineHeight: 1, flexShrink: 0 }}>+</span>
                    <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--fg)' }}>New issue</span>
                    {singleTeam ? (
                        selectedTeam && <span style={{ fontSize: 12.5, color: 'var(--fg3)' }}>{selectedTeam.name}</span>
                    ) : (
                        <Menu
                            placement="bottom-start"
                            trigger={
                                <button type="button" aria-label="Issue team" className={chipClasses(false)}
                                    style={{ ...chipStyle, padding: '4px 11px', fontSize: 12.5 }}>
                                    {selectedTeam?.name ?? 'Select team…'}
                                </button>
                            }
                            items={teamList.map((t) => ({ key: t.id, label: t.name, onActivate: () => setTeamId(t.id) }))}
                        />
                    )}
                    <IconButton title="Close" style={{ marginLeft: 'auto' }} onClick={onClose}>✕</IconButton>
                </div>

                {/* Scrollable body */}
                <div style={{ flex: 1, overflow: 'auto', padding: '22px 26px' }}>
                    <input
                        autoFocus
                        aria-label="Issue title"
                        placeholder="Issue title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        style={{
                            border: 'none', background: 'none', outline: 'none', width: '100%', boxSizing: 'border-box',
                            fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-.03em',
                            color: 'var(--fg)', padding: '0 0 12px', margin: 0,
                        }}
                    />

                    <textarea
                        aria-label="Issue description"
                        placeholder="Describe the problem, expected behavior, and steps to reproduce…"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={5}
                        className="border-border focus:border-fg"
                        style={{
                            display: 'block', width: '100%', boxSizing: 'border-box', background: 'var(--bg2)',
                            borderWidth: 'var(--line)', borderStyle: 'solid', borderRadius: 12,
                            padding: '11px 13px', fontSize: 13.5, lineHeight: 1.6,
                            color: 'var(--fg2)', fontFamily: 'inherit', resize: 'vertical',
                            outline: 'none', marginBottom: 22,
                        }}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Status */}
                        <Row label="Status">
                            {STATUS_OPTIONS.map((o) => (
                                <button key={o.value} type="button" aria-label={`Status ${o.label}`}
                                    aria-pressed={status === o.value} onClick={() => setStatus(o.value)}
                                    className={chipClasses(status === o.value)} style={chipStyle}>
                                    <StatusIcon status={o.value} size={13} />{o.label}
                                </button>
                            ))}
                        </Row>

                        {/* Priority */}
                        <Row label="Priority">
                            {PRIORITY_OPTIONS.map((o) => (
                                <button key={o.value} type="button" aria-label={`Priority ${o.label}`}
                                    aria-pressed={priority === o.value} onClick={() => setPriority(o.value)}
                                    className={chipClasses(priority === o.value)} style={chipStyle}>
                                    <PriorityIcon priority={o.value} />{o.label}
                                </button>
                            ))}
                        </Row>

                        {/* Assignee — single searchable picker */}
                        <Row label="Assignee">
                            <Menu
                                searchable
                                searchPlaceholder="Search people…"
                                placement="bottom-start"
                                trigger={
                                    <button type="button" aria-label="Issue assignee" className="border-border hover:border-fg"
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 9, width: 290, maxWidth: '100%',
                                            background: 'var(--bg2)', borderWidth: 'var(--line)', borderStyle: 'solid',
                                            borderRadius: 'var(--radius-pill)', padding: '6px 12px', fontSize: 13.5, fontWeight: 600,
                                            fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
                                            color: selectedMember ? 'var(--fg)' : 'var(--fg3)',
                                        }}>
                                        {selectedMember ? <Avatar {...avatarFor(selectedMember)} size={20} /> : <Avatar size={20} />}
                                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedMember?.name ?? 'Unassigned'}</span>
                                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg3)' }}>Change</span>
                                    </button>
                                }
                                items={[
                                    { key: '__none__', label: 'Unassigned', icon: <Avatar size={16} />, onActivate: () => setAssigneeId(null) },
                                    ...memberList.map((m) => ({
                                        key: m.id, label: m.name,
                                        icon: <Avatar {...avatarFor(m)} size={16} />,
                                        onActivate: () => setAssigneeId(m.id),
                                    })),
                                ]}
                            />
                        </Row>

                        {/* Project */}
                        <Row label="Project">
                            {projectList.map((p) => (
                                <button key={p.id} type="button" aria-label={`Project ${p.name}`}
                                    aria-pressed={projectId === p.id} onClick={() => setProjectId(p.id)}
                                    className={chipClasses(projectId === p.id)} style={chipStyle}>
                                    {projectSwatch(p.color)}{p.name}
                                </button>
                            ))}
                            <button type="button" aria-label="No project"
                                aria-pressed={projectId === null} onClick={() => setProjectId(null)}
                                className={chipClasses(projectId === null)} style={chipStyle}>
                                No project
                            </button>
                        </Row>

                        {/* Release */}
                        <Row label="Release">
                            {releaseList.map((r) => (
                                <button key={r.id} type="button" aria-label={`Release ${r.name}`}
                                    aria-pressed={releaseId === r.id} onClick={() => setReleaseId(r.id)}
                                    className={chipClasses(releaseId === r.id)} style={chipStyle}>
                                    ⛴ {r.name}
                                </button>
                            ))}
                            <button type="button" aria-label="No release"
                                aria-pressed={releaseId === null} onClick={() => setReleaseId(null)}
                                className={chipClasses(releaseId === null)} style={chipStyle}>
                                No release
                            </button>
                        </Row>

                        {/* Labels (multi-select) */}
                        {labelList.length > 0 && (
                            <Row label="Labels">
                                {labelList.map((l) => (
                                    <button key={l.id} type="button" aria-label={`Label ${l.name}`}
                                        aria-pressed={labelIds.includes(l.id)} onClick={() => toggleLabel(l.id)}
                                        className={chipClasses(labelIds.includes(l.id))} style={chipStyle}>
                                        {labelDot(l.color)}{l.name}
                                    </button>
                                ))}
                            </Row>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg2)' }}>
                    <span style={{ fontSize: 11.5, color: 'var(--fg3)' }}>
                        {title.trim() ? '' : 'Add a title to create this issue'}
                    </span>
                    <Button variant="secondary" onClick={() => void submit(true)} disabled={!canSubmit} style={{ marginLeft: 'auto' }}>
                        Create more
                    </Button>
                    <Button variant="primary" aria-label="Create issue" onClick={() => void submit(false)} disabled={!canSubmit}>
                        Create issue
                    </Button>
                </div>
            </div>
        </Drawer>
    );
}
