import { useEffect, useState } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { Menu } from '../../components/ui/Menu';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { ProjectPill } from '../../components/ui/ProjectPill';
import { useTeams } from '../teams/hooks';
import { useProjects } from '../projects/hooks';
import { useCreateIssue } from './hooks';
import type { IssueStatus, IssuePriority } from '../../lib/types';

export interface CreateIssueDrawerProps {
    open: boolean;
    initialStatus?: IssueStatus | null;
    onClose(): void;
}

const STATUS_OPTIONS: Array<{ label: string; value: IssueStatus }> = [
    { label: 'Backlog', value: 'backlog' },
    { label: 'Todo', value: 'todo' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'In Review', value: 'in_review' },
    { label: 'Done', value: 'done' },
];

const PRIORITY_OPTIONS: Array<{ label: string; value: IssuePriority }> = [
    { label: 'None', value: 'no_priority' },
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Urgent', value: 'urgent' },
];

export function CreateIssueDrawer({ open, initialStatus, onClose }: CreateIssueDrawerProps) {
    const teams = useTeams();
    const projects = useProjects();
    const createIssue = useCreateIssue();

    const [teamId, setTeamId] = useState<string | null>(null);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [status, setStatus] = useState<IssueStatus>(initialStatus ?? 'todo');
    const [priority, setPriority] = useState<IssuePriority>('no_priority');
    const [description, setDescription] = useState('');
    // assignee deferred to R-C

    // Auto-select when there is exactly one team
    useEffect(() => {
        if (teams.data?.items?.length === 1) {
            setTeamId(teams.data.items[0].id);
        }
    }, [teams.data]);

    // Reset form fields each time the drawer opens
    useEffect(() => {
        if (open) {
            setTitle('');
            setStatus(initialStatus ?? 'todo');
            setPriority('no_priority');
            setDescription('');
            setProjectId(null);
        }
    }, [open, initialStatus]);

    const selectedTeam = teams.data?.items?.find((t) => t.id === teamId);
    const singleTeam = (teams.data?.items?.length ?? 0) === 1;
    const selectedProject = projects.data?.items?.find((p) => p.id === projectId);

    async function handleSubmit() {
        if (!teamId || !title.trim()) return;
        try {
            await createIssue.mutateAsync({
                team_id: teamId,
                title: title.trim(),
                status,
                priority,
                description: description.trim() || null,
                project_id: projectId,
            });
            onClose();
        } catch {
            // error stays silent in R-B; R-C adds inline error display
        }
    }

    return (
        <Drawer open={open} onClose={onClose} side="right" width={520}>
            <div
                style={{
                    padding: '24px 28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20,
                    height: '100%',
                }}
            >
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--fg)' }}>New issue</span>
                    <IconButton title="Close" style={{ marginLeft: 'auto' }} onClick={onClose}>
                        ✕
                    </IconButton>
                </div>

                {/* Team selector — hidden (static text) when exactly one team */}
                {singleTeam ? (
                    <div style={{ fontSize: 13, color: 'var(--fg2)' }}>{selectedTeam?.name}</div>
                ) : (
                    <Menu
                        placement="bottom-start"
                        trigger={
                            <button
                                type="button"
                                aria-label="Issue team"
                                style={{
                                    background: 'var(--panel)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 9,
                                    color: teamId ? 'var(--fg)' : 'var(--fg3)',
                                    fontSize: 13,
                                    padding: '6px 10px',
                                    fontFamily: 'inherit',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    width: '100%',
                                }}
                            >
                                {selectedTeam?.name ?? 'Select team…'}
                            </button>
                        }
                        items={
                            teams.data?.items?.map((t) => ({
                                key: t.id,
                                label: t.name,
                                onActivate: () => setTeamId(t.id),
                            })) ?? []
                        }
                    />
                )}

                {/* Project (optional) */}
                <Menu
                    placement="bottom-start"
                    trigger={
                        <button
                            type="button"
                            aria-label="Issue project"
                            style={{
                                background: 'var(--panel)',
                                border: '1px solid var(--border)',
                                borderRadius: 9,
                                color: projectId ? 'var(--fg)' : 'var(--fg3)',
                                fontSize: 13,
                                padding: '6px 10px',
                                fontFamily: 'inherit',
                                cursor: 'pointer',
                                textAlign: 'left',
                                width: '100%',
                            }}
                        >
                            {selectedProject ? (
                                <ProjectPill name={selectedProject.name} color={selectedProject.color} />
                            ) : (
                                'No project'
                            )}
                        </button>
                    }
                    items={[
                        { key: '__none__', label: 'No project', onActivate: () => setProjectId(null) },
                        ...(projects.data?.items?.map((p) => ({
                            key: p.id,
                            label: p.name,
                            onActivate: () => setProjectId(p.id),
                        })) ?? []),
                    ]}
                />

                {/* Title */}
                <Input
                    autoFocus
                    placeholder="Issue title…"
                    aria-label="Issue title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

                {/* Status */}
                <SegmentedControl<IssueStatus>
                    options={STATUS_OPTIONS}
                    value={status}
                    onChange={setStatus}
                />

                {/* Priority */}
                <SegmentedControl<IssuePriority>
                    options={PRIORITY_OPTIONS}
                    value={priority}
                    onChange={setPriority}
                />

                {/* Description */}
                <Textarea
                    placeholder="Add a description…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                />

                {/* Footer */}
                <div
                    style={{
                        display: 'flex',
                        gap: 8,
                        marginTop: 'auto',
                        paddingTop: 16,
                        borderTop: '1px solid var(--border)',
                    }}
                >
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        disabled={!teamId || !title.trim() || createIssue.isPending}
                        onClick={() => void handleSubmit()}
                        aria-label="Create issue"
                    >
                        Create issue
                    </Button>
                </div>
            </div>
        </Drawer>
    );
}
