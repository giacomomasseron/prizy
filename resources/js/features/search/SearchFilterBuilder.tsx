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
        <div style={{ margin: '14px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Pills row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--fg3)', fontWeight: 500 }}>Filters</span>

                {/* Active filter pills */}
                {activeKeys.map((key) => {
                    const value = (filters as Record<string, string>)[key];
                    const fieldDef = SEARCH_FILTER_FIELDS.find((f) => f.key === key);
                    const fieldLabel = fieldDef?.label ?? key;
                    const valueLabel = resolveValueLabel(key, value);

                    return (
                        <span
                            key={key}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '3px 6px 3px 9px',
                                borderRadius: 7,
                                background: 'var(--accent2)',
                                color: 'var(--accent)',
                                fontSize: 11.5,
                                fontWeight: 600,
                                border: '1px solid transparent',
                            }}
                        >
                            {fieldLabel}
                            <span style={{ color: 'var(--fg3)', fontWeight: 400, fontSize: 11 }}>
                                · is ·
                            </span>
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
                                style={{
                                    color: 'var(--accent)',
                                    fontSize: 12,
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    lineHeight: 1,
                                    marginLeft: 2,
                                    fontFamily: 'inherit',
                                }}
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
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '3px 9px',
                                borderRadius: 7,
                                border: '1px dashed var(--border)',
                                background: 'transparent',
                                color: 'var(--fg3)',
                                fontSize: 12,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                            }}
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
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 12,
                            color: 'var(--fg3)',
                            padding: '3px 6px',
                            fontFamily: 'inherit',
                        }}
                    >
                        Clear all
                    </button>
                )}
            </div>

            {/* Value picker card (shown after selecting a field from the + Add filter menu) */}
            {pendingField && pendingFieldDef && (
                <div
                    style={{
                        display: 'inline-flex',
                        flexDirection: 'column',
                        gap: 4,
                        padding: 12,
                        background: 'var(--panel)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        boxShadow: '0 4px 16px rgba(0,0,0,.18)',
                        maxWidth: 320,
                        alignSelf: 'flex-start',
                    }}
                >
                    <span
                        style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--fg3)',
                            marginBottom: 4,
                            textTransform: 'uppercase',
                            letterSpacing: '.04em',
                        }}
                    >
                        Choose {pendingFieldDef.label}
                    </span>
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
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '5px 10px',
                                    borderRadius: 7,
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg)',
                                    cursor: 'pointer',
                                    fontSize: 12.5,
                                    fontFamily: 'inherit',
                                    color: 'var(--fg)',
                                }}
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
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 11.5,
                            color: 'var(--fg3)',
                            padding: '4px 0 0',
                            textAlign: 'left',
                            fontFamily: 'inherit',
                        }}
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
}
