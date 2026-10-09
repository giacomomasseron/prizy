import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { IssuePriority, Project, ProjectStatus } from '../../lib/types';
import { PROJECT_STATUS } from '../projects/projectStatus';
import { useCreateProject } from '../projects/hooks';
import { useMembers } from '../members/hooks';
import { avatarFor } from '../../lib/avatarFor';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { PriorityIcon } from '../../components/ui/PriorityIcon';
import { PropertyRow } from '../../components/ui/PropertyRow';
import { FIELD_CLASSES, TITLE_FIELD_CLASSES, titleFieldEdge } from '../../components/ui/Input';
import { chipClasses, chipStyle } from '../issues/issueStyles';
import { alertBox, swatchStyle } from '../settings/settingsStyles';
import { deskCard, tint } from '../support/supportStyles';

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

const STATUSES: StatusOption[] = (Object.keys(PROJECT_STATUS) as ProjectStatus[]).map((value) => ({
    value, label: PROJECT_STATUS[value].label, dotColor: PROJECT_STATUS[value].color,
}));

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

/** Status / lead / priority chips: the new-issue composer's chips (selected = ink-filled; colours in classes). */
const chip: CSSProperties = { ...chipStyle, padding: '5px 12px', fontSize: 13 };

/** Native date input as a pill field; its border colour lives in FIELD_CLASSES. */
const dateInput: CSSProperties = {
    background: 'var(--panel)', borderRadius: 'var(--radius-pill)', color: 'var(--fg)', fontSize: 13,
    padding: '6px 12px', fontFamily: 'inherit', outline: 'none',
};

/** The new-issue composer's display-font title input. */
const nameInput: CSSProperties = {
    flex: 1, minWidth: 0, ...titleFieldEdge, background: 'none', outline: 'none',
    fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-.03em', color: 'var(--fg)',
};

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

    const [error, setError] = useState<string | null>(null);

    const create = useCreateProject();
    const members = useMembers();
    const memberList = members.data ?? [];

    async function handleSubmit() {
        setError(null);
        try {
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
        } catch (e) {
            setError(
                (e instanceof Error && e.message)
                    ? e.message
                    : 'Could not create project.'
            );
        }
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
                        borderRadius: 8,
                        background: color,
                        flexShrink: 0,
                    }}
                />
                <input
                    aria-label="Project name"
                    placeholder="Project name"
                    className={TITLE_FIELD_CLASSES}
                    style={nameInput}
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
            </div>

            {/* Description textarea */}
            <textarea
                aria-label="Project summary"
                placeholder="Add a short summary…"
                className={TITLE_FIELD_CLASSES}
                style={{
                    width: '100%',
                    height: 52,
                    resize: 'none',
                    ...titleFieldEdge,
                    background: 'transparent',
                    outline: 'none',
                    fontSize: 15,
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
            <div style={{ ...deskCard, padding: 6, display: 'flex', flexDirection: 'column' }}>
                {/* Status row */}
                <PropertyRow label="Status">
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {STATUSES.map(s => (
                            <button
                                key={s.value}
                                type="button"
                                style={chip}
                                aria-pressed={status === s.value}
                                className={chipClasses(status === s.value)}
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
                            style={chip}
                            aria-pressed={leadId === null}
                            className={chipClasses(leadId === null)}
                            onClick={() => setLeadId(null)}
                        >
                            No lead
                        </button>
                        {memberList.map(m => (
                            <button
                                key={m.id}
                                type="button"
                                style={chip}
                                aria-pressed={leadId === m.id}
                                className={chipClasses(leadId === m.id)}
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
                                style={chip}
                                aria-pressed={priority === p.value}
                                className={chipClasses(priority === p.value)}
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
                        aria-label="Start date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className={FIELD_CLASSES}
                        style={dateInput}
                    />
                    <span style={{ color: 'var(--fg3)' }}>→</span>
                    <input
                        type="date"
                        aria-label="Target date"
                        value={targetDate}
                        onChange={e => setTargetDate(e.target.value)}
                        className={FIELD_CLASSES}
                        style={dateInput}
                    />
                </PropertyRow>

                {divider}

                {/* Color row */}
                <PropertyRow label="Color">
                    <div role="group" aria-label="Colour" style={{ display: 'flex', gap: 8 }}>
                        {COLORS.map(c => (
                            <button
                                key={c}
                                type="button"
                                aria-label={c}
                                aria-pressed={color === c}
                                style={swatchStyle(c, color === c, 26)}
                                onClick={() => setColor(c)}
                            />
                        ))}
                    </div>
                </PropertyRow>
            </div>

            {/* Inline error */}
            {error && (
                <div style={{ ...alertBox, color: 'var(--red-ink)', background: tint('var(--red)', 10), marginTop: 14 }}>
                    {error}
                </div>
            )}

            {/* Footer */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 10,
                    marginTop: 14,
                }}
            >
                <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!name.trim() || create.isPending}>Create project</Button>
            </div>
        </div>
    );
}
