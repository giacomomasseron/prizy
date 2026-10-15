import type { CSSProperties, ReactNode } from 'react';
import { Menu } from '../../components/ui/Menu';
import { StatusIcon } from '../../components/ui/StatusIcon';
import { PriorityIcon } from '../../components/ui/PriorityIcon';
import { Avatar } from '../../components/ui/Avatar';
import { LabelChip } from '../../components/ui/LabelChip';
import { ProjectPill } from '../../components/ui/ProjectPill';
import { avatarFor } from '../../lib/avatarFor';
import { useMe } from '../../auth/useAuth';
import { STATUSES, useAssignIssue, useIssueLabels, useSetIssueLabels, useTransitionStatus, useUpdateIssue } from './hooks';
import { useMembers } from '../members/hooks';
import { useProjects } from '../projects/hooks';
import { useCycles } from '../teams/hooks';
import { useReleases } from '../releases/hooks';
import { useLabels } from '../labels/hooks';
import { toggleExclusive } from '../labels/labelGroups';
import { AssignToMeButton } from './AssignToMeButton';
import { PRIORITY_LABELS, STATUS_LABELS } from './issueMeta';
import type { Issue, IssuePriority } from '../../lib/types';

/** The drawer's order (Prizy v2): most urgent first, No priority last. */
const PRIORITIES: IssuePriority[] = ['urgent', 'high', 'medium', 'low', 'no_priority'];

// Colours that change on hover live in classes (an inline background would beat `hover:`).
const rowStyle: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 8px', border: 'none', borderRadius: 8,
    textAlign: 'left', fontFamily: 'inherit', color: 'var(--fg)', cursor: 'pointer',
};
const labelStyle: CSSProperties = { width: 96, flexShrink: 0, fontSize: 12, color: 'var(--fg3)' };
const valueStyle: CSSProperties = { flex: 1, minWidth: 0, display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13 };
const caretStyle: CSSProperties = { fontSize: 9, color: 'var(--fg3)' };
const muted: CSSProperties = { color: 'var(--fg3)' };
/** A name that ends in … rather than crowding the row (the mockup's assignee). */
const ellipsis: CSSProperties = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 };
/** The menu opens under the value column. */
const POPOVER: CSSProperties = { left: 106, right: 6, minWidth: 0, maxHeight: 300, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 2 };
const OPTION: CSSProperties = { padding: '7px 10px', borderRadius: 9, fontSize: 13, fontWeight: 400 };

function dot(color: string, radius: string | number, size: number) {
    return <span style={{ width: size, height: size, borderRadius: radius, background: color, display: 'inline-block', flexShrink: 0 }} />;
}

interface Option {
    key: string;
    label: string;
    icon?: ReactNode;
    checked: boolean;
    onPick(): void;
}

interface RowProps {
    label: string;
    value: ReactNode;
    options: Option[];
    /** Several at once (labels): the menu stays open after a pick. */
    multi?: boolean;
    canEdit: boolean;
    /** A quick action beside the row (Assign to me). */
    quick?: ReactNode;
}

/** One property: the whole row (label, value, caret) opens the options under the value. */
function Row({ label, value, options, multi = false, canEdit, quick }: RowProps) {
    // The space between label and value is collapsed by the flex row but keeps the two words apart for screen readers.
    const content = <><span style={labelStyle}>{label}</span>{' '}<span style={valueStyle}>{value}</span></>;
    if (!canEdit) return <div style={{ ...rowStyle, cursor: 'default' }}>{content}</div>;
    return (
        // The menu lines up with this row, so it also spans a quick action beside the row's button.
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Menu
                fullWidth
                anchorToParent
                selection={multi ? 'multi' : 'single'}
                popoverStyle={POPOVER}
                itemStyle={OPTION}
                trigger={
                    <button type="button" className="bg-transparent hover:bg-hover" style={rowStyle}>
                        {content}
                        <span aria-hidden="true" style={caretStyle}>▾</span>
                    </button>
                }
                items={options.map((o) => ({ key: o.key, label: o.label, icon: o.icon, checked: o.checked, onActivate: o.onPick }))}
            />
            {quick}
        </div>
    );
}

export interface PeekPropertiesProps {
    issue: Issue;
    canEdit: boolean;
    /** Reports a save that does not go through. */
    track(saving: Promise<unknown>): void;
}

/** The drawer's property box (Prizy v2): each row opens a menu of its options, the current one checked. */
export function PeekProperties({ issue, canEdit, track }: PeekPropertiesProps) {
    const me = useMe();
    const transition = useTransitionStatus();
    const update = useUpdateIssue(issue.id);
    const assign = useAssignIssue(issue.id);
    const setLabels = useSetIssueLabels(issue.id);
    const issueLabels = useIssueLabels(issue.id);
    const members = useMembers();
    // The current values come embedded on the issue; the lists are only needed to change them.
    const projects = useProjects(undefined, { enabled: canEdit });
    const cycles = useCycles(issue.team_id, { enabled: canEdit });
    const releases = useReleases({ enabled: canEdit });
    const allLabels = useLabels({ enabled: canEdit });

    const labels = issueLabels.data?.items ?? [];
    const labelIds = new Set(labels.map((l) => l.id));
    const labelList = allLabels.data?.items ?? [];
    const assignee = issue.assignee ?? null;
    const meId = me.data?.id;
    // Not while you are being saved: the button would only come back until the issue is fetched again.
    const offerAssignToMe = !!meId && issue.assignee_id !== meId && !(assign.isPending && assign.variables === meId);

    return (
        <div role="group" aria-label="Properties" style={{ display: 'flex', flexDirection: 'column', gap: 2, border: 'var(--line) solid var(--border)', borderRadius: 16, padding: 6 }}>
            <Row
                label="Status"
                canEdit={canEdit}
                value={<><StatusIcon status={issue.status} size={14} decorative />{STATUS_LABELS[issue.status] ?? issue.status}</>}
                options={STATUSES.map((s) => ({
                    key: s, label: STATUS_LABELS[s], icon: <StatusIcon status={s} size={14} decorative />, checked: issue.status === s,
                    onPick: () => track(transition.mutateAsync({ id: issue.id, status: s })),
                }))}
            />
            <Row
                label="Priority"
                canEdit={canEdit}
                value={<><PriorityIcon priority={issue.priority} decorative />{PRIORITY_LABELS[issue.priority] ?? issue.priority}</>}
                options={PRIORITIES.map((p) => ({
                    key: p, label: PRIORITY_LABELS[p], icon: <PriorityIcon priority={p} decorative />, checked: issue.priority === p,
                    onPick: () => track(update.mutateAsync({ priority: p })),
                }))}
            />
            <Row
                label="Assignee"
                canEdit={canEdit}
                value={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0, maxWidth: '100%' }}>
                        <span aria-hidden="true" style={{ display: 'inline-flex' }}>{assignee ? <Avatar {...avatarFor(assignee)} size={20} /> : <Avatar size={20} />}</span>
                        <span style={ellipsis}>{assignee?.name ?? 'Unassigned'}</span>
                    </span>
                }
                options={[
                    ...(members.data ?? []).map((m) => ({
                        key: m.id, label: m.id === me.data?.id ? `${m.name} (me)` : m.name, icon: <Avatar {...avatarFor(m)} size={20} />,
                        checked: issue.assignee_id === m.id, onPick: () => track(assign.mutateAsync(m.id)),
                    })),
                    { key: 'none', label: 'Unassigned', icon: <Avatar size={20} />, checked: !issue.assignee_id, onPick: () => track(assign.mutateAsync(null)) },
                ]}
                quick={offerAssignToMe && meId ? <AssignToMeButton onAssign={() => track(assign.mutateAsync(meId))} /> : null}
            />
            <Row
                label="Project"
                canEdit={canEdit}
                value={issue.project ? <ProjectPill name={issue.project.name} color={issue.project.color} /> : <span style={muted}>No project</span>}
                options={[
                    ...(projects.data?.items ?? []).map((p) => ({
                        key: p.id, label: p.name, icon: dot(p.color, 3, 9), checked: issue.project_id === p.id,
                        onPick: () => track(update.mutateAsync({ project_id: p.id })),
                    })),
                    { key: 'none', label: 'No project', icon: dot('var(--fg3)', 3, 9), checked: !issue.project_id, onPick: () => track(update.mutateAsync({ project_id: null })) },
                ]}
            />
            {/* Not in the mockup, which predates releases: kept, and edited like the rest. */}
            <Row
                label="Release"
                canEdit={canEdit}
                value={issue.release ? <span>⛴ {issue.release.name}{issue.release.shipped_at ? ' ✓' : ''}</span> : <span style={muted}>No release</span>}
                options={[
                    ...(releases.data ?? []).map((r) => ({
                        key: r.id, label: r.name, checked: issue.release_id === r.id, onPick: () => track(update.mutateAsync({ release_id: r.id })),
                    })),
                    { key: 'none', label: 'No release', checked: !issue.release_id, onPick: () => track(update.mutateAsync({ release_id: null })) },
                ]}
            />
            <Row
                label="Labels"
                canEdit={canEdit}
                multi
                value={labels.length > 0 ? labels.map((l) => <LabelChip key={l.id} name={l.name} color={l.color} />) : <span style={muted}>{canEdit ? 'Add labels' : 'No labels'}</span>}
                options={labelList.map((l) => ({
                    key: l.id, label: l.name, icon: dot(l.color, '50%', 8), checked: labelIds.has(l.id),
                    onPick: () => track(setLabels.mutateAsync(toggleExclusive(labelIds, l, labelList))),
                }))}
            />
            <Row
                label="Cycle"
                canEdit={canEdit}
                value={issue.cycle ? <span>{issue.cycle.name}</span> : <span style={muted}>No cycle</span>}
                options={[
                    ...(cycles.data?.items ?? []).map((c) => ({
                        key: c.id, label: c.name, checked: issue.cycle_id === c.id, onPick: () => track(update.mutateAsync({ cycle_id: c.id })),
                    })),
                    { key: 'none', label: 'No cycle', checked: !issue.cycle_id, onPick: () => track(update.mutateAsync({ cycle_id: null })) },
                ]}
            />
        </div>
    );
}
