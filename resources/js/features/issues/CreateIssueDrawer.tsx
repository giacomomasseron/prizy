import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { IconButton } from '../../components/ui/IconButton';
import { Menu } from '../../components/ui/Menu';
import { StatusIcon } from '../../components/ui/StatusIcon';
import { PriorityIcon } from '../../components/ui/PriorityIcon';
import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';
import { useTeams } from '../teams/hooks';
import { useProjects } from '../projects/hooks';
import { useMembers } from '../members/hooks';
import { useLabels } from '../labels/hooks';
import { useCreateIssue } from './hooks';
import type { IssueStatus, IssuePriority } from '../../lib/types';

export interface CreateIssueDrawerProps {
    open: boolean;
    initialStatus?: IssueStatus | null;
    onClose(): void;
}

// New-issue statuses (Done excluded — you don't file a new issue as done).
const STATUS_OPTIONS: Array<{ label: string; value: IssueStatus }> = [
    { label: 'Backlog', value: 'backlog' },
    { label: 'Todo', value: 'todo' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'In Review', value: 'in_review' },
];

const PRIORITY_OPTIONS: Array<{ label: string; value: IssuePriority }> = [
    { label: 'Urgent', value: 'urgent' },
    { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' },
    { label: 'Low', value: 'low' },
    { label: 'No priority', value: 'no_priority' },
];

// The design's chip: bordered pill, accent when selected (matches Prizy Create.dc.html).
function chipStyle(active: boolean): CSSProperties {
    return {
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '6px 11px', borderRadius: 8, border: '1px solid',
        cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit',
        borderColor: active ? 'var(--accent)' : 'var(--border)',
        background: active ? 'var(--accent2)' : 'transparent',
        color: active ? 'var(--fg)' : 'var(--fg2)',
    };
}

const rowLabel: CSSProperties = { width: 72, flexShrink: 0, fontSize: 12.5, color: 'var(--fg3)', paddingTop: 7 };

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div style={{ display: 'flex', gap: 12, padding: '9px 0' }}>
            <span style={rowLabel}>{label}</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{children}</div>
        </div>
    );
}

function colorDot(color: string) {
    return <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />;
}

export function CreateIssueDrawer({ open, initialStatus, onClose }: CreateIssueDrawerProps) {
    const teams = useTeams();
    const projects = useProjects(undefined, { enabled: open });
    const members = useMembers();
    const labels = useLabels({ enabled: open });
    const createIssue = useCreateIssue();

    const [teamId, setTeamId] = useState<string | null>(null);
    const [projectId, setProjectId] = useState<string | null>(null);
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ width: 20, height: 20, borderRadius: 6, background: 'var(--accent)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, lineHeight: 1, flexShrink: 0 }}>+</span>
                    <span style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--fg)' }}>New issue</span>
                    {singleTeam ? (
                        selectedTeam && <span style={{ fontSize: 12.5, color: 'var(--fg3)' }}>{selectedTeam.name}</span>
                    ) : (
                        <Menu
                            placement="bottom-start"
                            trigger={
                                <button type="button" aria-label="Issue team" className="hover:bg-hover"
                                    style={{ ...chipStyle(false), padding: '3px 9px', color: teamId ? 'var(--fg2)' : 'var(--fg3)' }}>
                                    {selectedTeam?.name ?? 'Select team…'}
                                </button>
                            }
                            items={teamList.map((t) => ({ key: t.id, label: t.name, onActivate: () => setTeamId(t.id) }))}
                        />
                    )}
                    <IconButton title="Close" style={{ marginLeft: 'auto' }} onClick={onClose}>✕</IconButton>
                </div>

                {/* Scrollable body */}
                <div style={{ flex: 1, overflow: 'auto', padding: '22px 24px' }}>
                    <input
                        autoFocus
                        aria-label="Issue title"
                        placeholder="Issue title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        style={{
                            border: 'none', background: 'none', outline: 'none', width: '100%',
                            fontSize: 20, fontWeight: 600, letterSpacing: '-.01em',
                            color: 'var(--fg)', fontFamily: 'inherit', padding: 0, marginBottom: 14,
                        }}
                    />

                    <textarea
                        aria-label="Issue description"
                        placeholder="Describe the problem, expected behavior, and steps to reproduce…"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        style={{
                            width: '100%', minHeight: 118, background: 'var(--bg2)',
                            border: '1px solid var(--border)', borderRadius: 10,
                            padding: '12px 13px', fontSize: 13.5, lineHeight: 1.6,
                            color: 'var(--fg)', fontFamily: 'inherit', resize: 'vertical',
                            boxSizing: 'border-box', outline: 'none', marginBottom: 20,
                        }}
                    />

                    {/* Status */}
                    <Row label="Status">
                        {STATUS_OPTIONS.map((o) => (
                            <button key={o.value} type="button" aria-label={`Status ${o.label}`}
                                aria-pressed={status === o.value} onClick={() => setStatus(o.value)}
                                style={chipStyle(status === o.value)}>
                                <StatusIcon status={o.value} size={13} />{o.label}
                            </button>
                        ))}
                    </Row>

                    {/* Priority */}
                    <Row label="Priority">
                        {PRIORITY_OPTIONS.map((o) => (
                            <button key={o.value} type="button" aria-label={`Priority ${o.label}`}
                                aria-pressed={priority === o.value} onClick={() => setPriority(o.value)}
                                style={chipStyle(priority === o.value)}>
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
                                <button type="button" aria-label="Issue assignee" className="hover:border-border2"
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 190,
                                        border: '1px solid var(--border)', background: 'var(--bg2)', borderRadius: 8,
                                        padding: '6px 10px', fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer',
                                        color: selectedMember ? 'var(--fg)' : 'var(--fg3)', textAlign: 'left',
                                    }}>
                                    {selectedMember ? <Avatar {...avatarFor(selectedMember)} size={18} /> : <Avatar size={18} />}
                                    <span style={{ flex: 1 }}>{selectedMember?.name ?? 'Unassigned'}</span>
                                    <span style={{ color: 'var(--fg3)', fontSize: 10 }}>▾</span>
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
                                style={chipStyle(projectId === p.id)}>
                                {colorDot(p.color)}{p.name}
                            </button>
                        ))}
                        <button type="button" aria-label="No project"
                            aria-pressed={projectId === null} onClick={() => setProjectId(null)}
                            style={chipStyle(projectId === null)}>
                            No project
                        </button>
                    </Row>

                    {/* Labels (multi-select) */}
                    {labelList.length > 0 && (
                        <Row label="Labels">
                            {labelList.map((l) => (
                                <button key={l.id} type="button" aria-label={`Label ${l.name}`}
                                    aria-pressed={labelIds.includes(l.id)} onClick={() => toggleLabel(l.id)}
                                    style={chipStyle(labelIds.includes(l.id))}>
                                    {colorDot(l.color)}{l.name}
                                </button>
                            ))}
                        </Row>
                    )}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12, color: 'var(--fg3)' }}>
                        {title.trim() ? '' : 'Add a title to create this issue'}
                    </span>
                    <button type="button" onClick={() => void submit(true)} disabled={!canSubmit} className="hover:border-border2"
                        style={{ marginLeft: 'auto', border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg)', padding: '8px 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 500, cursor: canSubmit ? 'pointer' : 'default', opacity: canSubmit ? 1 : 0.5, fontFamily: 'inherit' }}>
                        Create more
                    </button>
                    <button type="button" aria-label="Create issue" onClick={() => void submit(false)} disabled={!canSubmit}
                        style={{ border: 'none', background: 'var(--accent)', color: '#fff', padding: '9px 16px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'default', opacity: canSubmit ? 1 : 0.5, fontFamily: 'inherit' }}>
                        Create issue
                    </button>
                </div>
            </div>
        </Drawer>
    );
}
