import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { IssuePriority, Project, ProjectStatus } from '../../lib/types';
import { useCreateProject } from '../projects/hooks';
import { useMembers } from '../members/hooks';
import { avatarFor } from '../../lib/avatarFor';
import { Avatar } from '../../components/ui/Avatar';
import { PriorityIcon } from '../../components/ui/PriorityIcon';
import { PropertyRow } from '../../components/ui/PropertyRow';

interface ProjectFormProps {
    onSuccess(project: Project): void;
    onCancel(): void;
}

const COLORS = ['#5b8def', '#b06ae0', '#3a9a68', '#e0894a', '#e05a8f', '#6d69f2'];

interface StatusOption {
    value: ProjectStatus;
    label: string;
    dotColor: string;
}

const STATUSES: StatusOption[] = [
    { value: 'planning',   label: 'Planning',   dotColor: 'var(--fg3)' },
    { value: 'in_progress', label: 'In Progress', dotColor: 'var(--blue)' },
    { value: 'paused',     label: 'Paused',     dotColor: 'var(--amber)' },
    { value: 'completed',  label: 'Completed',  dotColor: 'var(--green)' },
    { value: 'cancelled',  label: 'Cancelled',  dotColor: 'var(--red)' },
];

interface PriorityOption {
    value: IssuePriority;
    label: string;
}

const PRIORITIES: PriorityOption[] = [
    { value: 'no_priority', label: 'No priority' },
    { value: 'low',         label: 'Low' },
    { value: 'medium',      label: 'Medium' },
    { value: 'high',        label: 'High' },
    { value: 'urgent',      label: 'Urgent' },
];

function chipStyle(active: boolean): CSSProperties {
    return {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '6px 11px',
        borderRadius: 8,
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        fontSize: 12.5,
        background: active ? 'var(--accent2)' : 'transparent',
        color: active ? 'var(--fg)' : 'var(--fg2)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        lineHeight: 1,
    };
}

const divider = (
    <div
        aria-hidden
        style={{ height: 1, margin: '2px 6px', background: 'var(--border)' }}
    />
);

export default function ProjectForm({ onSuccess, onCancel }: ProjectFormProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<ProjectStatus>('planning');
    const [leadId, setLeadId] = useState<string | null>(null);
    const [priority, setPriority] = useState<IssuePriority>('no_priority');
    const [color, setColor] = useState(COLORS[0]);
    const [startDate, setStartDate] = useState('');
    const [targetDate, setTargetDate] = useState('');

    const create = useCreateProject();
    const members = useMembers();
    const memberList = members.data ?? [];

    async function handleSubmit() {
        const project = await create.mutateAsync({
            name,
            description: description || null,
            status,
            lead_id: leadId,
            priority,
            color,
            start_date: startDate || null,
            target_date: targetDate || null,
        });
        onSuccess(project);
    }

    return (
        <div>
            {/* Header: color swatch + name input */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 4,
                }}
            >
                <div
                    style={{
                        width: 26,
                        height: 26,
                        borderRadius: 7,
                        background: color,
                        flexShrink: 0,
                    }}
                />
                <input
                    placeholder="Project name"
                    style={{
                        flex: 1,
                        fontSize: 24,
                        fontWeight: 600,
                        color: 'var(--fg)',
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        fontFamily: 'inherit',
                    }}
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
            </div>

            {/* Description textarea */}
            <textarea
                placeholder="Add a short summary…"
                style={{
                    width: '100%',
                    height: 52,
                    resize: 'none',
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: 14,
                    color: 'var(--fg2)',
                    fontFamily: 'inherit',
                    marginBottom: 20,
                    boxSizing: 'border-box',
                    display: 'block',
                }}
                value={description}
                onChange={e => setDescription(e.target.value)}
            />

            {/* Property card */}
            <div
                style={{
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 6,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Status row */}
                <PropertyRow label="Status">
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {STATUSES.map(s => (
                            <button
                                key={s.value}
                                type="button"
                                style={chipStyle(status === s.value)}
                                onClick={() => setStatus(s.value)}
                            >
                                <span
                                    aria-hidden
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: s.dotColor,
                                        flexShrink: 0,
                                        display: 'inline-block',
                                    }}
                                />
                                {s.label}
                            </button>
                        ))}
                    </div>
                </PropertyRow>

                {divider}

                {/* Lead row */}
                <PropertyRow label="Lead">
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            style={chipStyle(leadId === null)}
                            onClick={() => setLeadId(null)}
                        >
                            No lead
                        </button>
                        {memberList.map(m => (
                            <button
                                key={m.id}
                                type="button"
                                style={chipStyle(leadId === m.id)}
                                onClick={() => setLeadId(m.id)}
                            >
                                <Avatar {...avatarFor(m)} size={18} />
                                {m.name}
                            </button>
                        ))}
                    </div>
                </PropertyRow>

                {divider}

                {/* Priority row */}
                <PropertyRow label="Priority">
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {PRIORITIES.map(p => (
                            <button
                                key={p.value}
                                type="button"
                                style={chipStyle(priority === p.value)}
                                onClick={() => setPriority(p.value)}
                            >
                                <PriorityIcon priority={p.value} />
                                {p.label}
                            </button>
                        ))}
                    </div>
                </PropertyRow>

                {divider}

                {/* Timeline row */}
                <PropertyRow label="Timeline">
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        style={{
                            border: '1px solid var(--border)',
                            background: 'var(--panel)',
                            borderRadius: 8,
                            padding: '6px 10px',
                            fontSize: 12.5,
                            color: 'var(--fg)',
                            fontFamily: 'inherit',
                        }}
                    />
                    <span style={{ color: 'var(--fg3)' }}>→</span>
                    <input
                        type="date"
                        value={targetDate}
                        onChange={e => setTargetDate(e.target.value)}
                        style={{
                            border: '1px solid var(--border)',
                            background: 'var(--panel)',
                            borderRadius: 8,
                            padding: '6px 10px',
                            fontSize: 12.5,
                            color: 'var(--fg)',
                            fontFamily: 'inherit',
                        }}
                    />
                </PropertyRow>

                {divider}

                {/* Color row */}
                <PropertyRow label="Color">
                    <div style={{ display: 'flex', gap: 8 }}>
                        {COLORS.map(c => (
                            <button
                                key={c}
                                type="button"
                                aria-label={c}
                                style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: 7,
                                    background: c,
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    flexShrink: 0,
                                    boxShadow: color === c
                                        ? '0 0 0 2px var(--bg), 0 0 0 4px var(--accent)'
                                        : 'none',
                                }}
                                onClick={() => setColor(c)}
                            />
                        ))}
                    </div>
                </PropertyRow>
            </div>

            {/* Footer */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 10,
                    marginTop: 22,
                }}
            >
                <button
                    type="button"
                    style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--fg2)',
                        padding: '8px 14px',
                        fontFamily: 'inherit',
                        fontSize: 12.5,
                    }}
                    onClick={onCancel}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    disabled={!name.trim()}
                    style={{
                        background: 'var(--accent)',
                        color: '#fff',
                        border: 'none',
                        cursor: name.trim() ? 'pointer' : 'not-allowed',
                        padding: '9px 18px',
                        borderRadius: 9,
                        fontSize: 12.5,
                        fontWeight: 600,
                        fontFamily: 'inherit',
                        opacity: name.trim() ? 1 : 0.5,
                    }}
                    onClick={handleSubmit}
                >
                    Create project
                </button>
            </div>
        </div>
    );
}
