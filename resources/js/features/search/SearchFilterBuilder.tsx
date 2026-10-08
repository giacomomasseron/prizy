import { useState } from 'react';
import type { IssueStatus, IssuePriority } from '../../lib/types';
import type { AdvancedSearchFilters } from './hooks';
import { SEARCH_FILTER_FIELDS, STATUSES, PRIORITIES, type FilterKey } from '../views/filters';
import { useMembers, type Member } from '../members/hooks';
import { useProjects } from '../projects/hooks';
import { useLabels } from '../labels/hooks';
import { StatusIcon } from '../../components/ui/StatusIcon';
import { PriorityIcon } from '../../components/ui/PriorityIcon';
import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';
import { Menu } from '../../components/ui/Menu';
import type { MenuItem } from '../../components/ui/Menu';
import type { Project, Label } from '../../lib/types';
import { sectionLabel } from '../../components/sidebarStyles';
import { HI_PILL_CLASSES, chipClasses, chipStyle, toolPillStyle } from '../issues/issueStyles';
import { smallLabel } from '../support/supportStyles';

function fmtLabel(value: string): string {
    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

const SOURCE_LABELS: Record<string, string> = {
    support: 'From Support',
    native: 'Native issue',
};

// ── Value icon rendered inside a pill ────────────────────────────────────────
interface ValueIconProps {
    filterKey: FilterKey;
    value: string;
    members: Member[];
    projects: Project[];
    labels: Label[];
}

function PillValueIcon({ filterKey, value, members, projects, labels }: ValueIconProps) {
    if (filterKey === 'status') {
        return <StatusIcon status={value as IssueStatus} size={12} />;
    }
    if (filterKey === 'priority') {
        return <PriorityIcon priority={value as IssuePriority} />;
    }
    if (filterKey === 'assignee_id') {
        const member = members.find((m) => m.id === value) ?? null;
        return <Avatar {...avatarFor(member)} size={14} />;
    }
    if (filterKey === 'project_id') {
        const project = projects.find((p) => p.id === value);
        return project ? (
            <span
                style={{ width: 8, height: 8, borderRadius: 2, background: project.color, flexShrink: 0 }}
            />
        ) : null;
    }
    if (filterKey === 'label_id') {
        const label = labels.find((l) => l.id === value);
        return label ? (
            <span
                style={{ width: 6, height: 6, borderRadius: '50%', background: label.color, flexShrink: 0 }}
            />
        ) : null;
    }
    // source or unknown
    return (
        <span
            style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fg3)', flexShrink: 0 }}
        />
    );
}

// ── Option icon inside the value picker card ─────────────────────────────────
interface OptionIconProps {
    filterKey: FilterKey;
    value: string;
    color?: string;
    members: Member[];
}

function OptionIcon({ filterKey, value, color, members }: OptionIconProps) {
    if (filterKey === 'status') {
        return <StatusIcon status={value as IssueStatus} size={12} />;
    }
    if (filterKey === 'priority') {
        return <PriorityIcon priority={value as IssuePriority} />;
    }
    if (filterKey === 'assignee_id') {
        const member = members.find((m) => m.id === value) ?? null;
        return <Avatar {...avatarFor(member)} size={14} />;
    }
    if ((filterKey === 'project_id' || filterKey === 'label_id') && color) {
        const isProject = filterKey === 'project_id';
        return (
            <span
                style={{
                    width: isProject ? 8 : 6,
                    height: isProject ? 8 : 6,
                    borderRadius: isProject ? 2 : '50%',
                    background: color,
                    flexShrink: 0,
                }}
            />
        );
    }
    if (filterKey === 'source') {
        return (
            <span
                style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fg3)', flexShrink: 0 }}
            />
        );
    }
    return null;
}

// ── Main component ────────────────────────────────────────────────────────────
export interface SearchFilterBuilderProps {
    filters: AdvancedSearchFilters;
    onChange: (f: AdvancedSearchFilters) => void;
}

export function SearchFilterBuilder({ filters, onChange }: SearchFilterBuilderProps) {
    const [pendingField, setPendingField] = useState<FilterKey | null>(null);

    const membersQuery = useMembers();
    const projectsQuery = useProjects();
    const labelsQuery = useLabels();

    const membersList: Member[] = membersQuery.data ?? [];
    const projectsList: Project[] = projectsQuery.data?.items ?? [];
    const labelsList: Label[] = labelsQuery.data?.items ?? [];

    const activeKeys = (Object.keys(filters) as FilterKey[]).filter(
        (k) => !!filters[k as keyof AdvancedSearchFilters],
    );
    const hasFilters = activeKeys.length > 0;

    function resolveValueLabel(key: FilterKey, value: string): string {
        if (key === 'status' || key === 'priority') return fmtLabel(value);
        if (key === 'assignee_id') return membersList.find((m) => m.id === value)?.name ?? value;
        if (key === 'project_id') return projectsList.find((p) => p.id === value)?.name ?? value;
        if (key === 'label_id') return labelsList.find((l) => l.id === value)?.name ?? value;
        if (key === 'source') return SOURCE_LABELS[value] ?? value;
        return value;
    }

    function getPickerOptions(key: FilterKey): Array<{ value: string; label: string; color?: string }> {
        if (key === 'status') return STATUSES.map((s) => ({ value: s, label: fmtLabel(s) }));
        if (key === 'priority') return PRIORITIES.map((p) => ({ value: p, label: fmtLabel(p) }));
        if (key === 'assignee_id') return membersList.map((m) => ({ value: m.id, label: m.name }));
        if (key === 'project_id') return projectsList.map((p) => ({ value: p.id, label: p.name, color: p.color }));
        if (key === 'label_id') return labelsList.map((l) => ({ value: l.id, label: l.name, color: l.color }));
        if (key === 'source') return [
            { value: 'support', label: 'From Support' },
            { value: 'native', label: 'Native issue' },
        ];
        return [];
    }

    function removeFilter(key: FilterKey) {
        const next = { ...filters };
        delete (next as Record<string, string>)[key];
        onChange(next);
    }

    const pendingFieldDef = SEARCH_FILTER_FIELDS.find((f) => f.key === pendingField);
    const pickerOptions = pendingField ? getPickerOptions(pendingField) : [];

    const addMenuItems: MenuItem[] = SEARCH_FILTER_FIELDS
        .filter((f) => !activeKeys.includes(f.key))
        .map((f) => ({
            key: f.key,
            label: f.label,
            onActivate: () => setPendingField(f.key),
        }));

    return (
        <div style={{ margin: '14px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Pills row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                <span style={{ ...sectionLabel, marginRight: 2 }}>Filters</span>

                {/* Active filter pills: the yellow highlighter, like the issue filter bar */}
                {activeKeys.map((key) => {
                    const value = (filters as Record<string, string>)[key];
                    const fieldDef = SEARCH_FILTER_FIELDS.find((f) => f.key === key);
                    const fieldLabel = fieldDef?.label ?? key;
                    const valueLabel = resolveValueLabel(key, value);

                    return (
                        <span
                            key={key}
                            className={HI_PILL_CLASSES}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 12px',
                                borderRadius: 'var(--radius-pill)', borderWidth: 'var(--line)', borderStyle: 'solid',
                                fontSize: 12.5, fontWeight: 700,
                            }}
                        >
                            {fieldLabel}
                            <span style={{ fontWeight: 500, fontSize: 12 }}>· is ·</span>
                            <PillValueIcon
                                filterKey={key}
                                value={value}
                                members={membersList}
                                projects={projectsList}
                                labels={labelsList}
                            />
                            {valueLabel}
                            <button
                                type="button"
                                aria-label={`Remove ${fieldLabel} filter`}
                                onClick={() => removeFilter(key)}
                                style={{ color: 'inherit', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1, marginLeft: 2, fontFamily: 'inherit' }}
                            >
                                ✕
                            </button>
                        </span>
                    );
                })}

                {/* + Add filter menu */}
                <Menu
                    trigger={
                        <button
                            type="button"
                            className="border-border2 bg-transparent text-fg2 hover:border-fg hover:text-fg"
                            style={{ ...toolPillStyle, padding: '5px 12px', fontSize: 12.5, borderStyle: 'dashed' }}
                        >
                            + Add filter
                        </button>
                    }
                    items={addMenuItems}
                />

                {/* Clear all */}
                {hasFilters && (
                    <button
                        type="button"
                        aria-label="Clear all"
                        onClick={() => onChange({})}
                        className="text-fg3 hover:text-fg"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, padding: '4px 8px', fontFamily: 'inherit' }}
                    >
                        Clear all
                    </button>
                )}
            </div>

            {/* Value picker card (shown after selecting a field from the + Add filter menu): the popover look */}
            {pendingField && pendingFieldDef && (
                <div
                    style={{
                        display: 'inline-flex', flexDirection: 'column', gap: 8, padding: 14,
                        background: 'var(--panel)', border: 'var(--line) solid var(--fg)', borderRadius: 'var(--radius-pop)',
                        boxShadow: 'var(--pop-shadow)', maxWidth: 360, alignSelf: 'flex-start',
                    }}
                >
                    <span style={smallLabel}>Choose {pendingFieldDef.label}</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {pickerOptions.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                aria-label={opt.label}
                                onClick={() => {
                                    onChange({ ...filters, [pendingField]: opt.value });
                                    setPendingField(null);
                                }}
                                className={chipClasses(false)}
                                style={{ ...chipStyle, padding: '5px 11px', fontSize: 12.5 }}
                            >
                                <OptionIcon
                                    filterKey={pendingField}
                                    value={opt.value}
                                    color={opt.color}
                                    members={membersList}
                                />
                                {opt.label}
                            </button>
                        ))}
                        {pickerOptions.length === 0 && (
                            <span style={{ fontSize: 12.5, color: 'var(--fg3)' }}>
                                No options available
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setPendingField(null)}
                        className="text-fg3 hover:text-fg"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, padding: '2px 0 0', textAlign: 'left', fontFamily: 'inherit', alignSelf: 'flex-start' }}
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
}
