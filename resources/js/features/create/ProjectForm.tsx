import { useRef, useState } from 'react';
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
import { readableOn } from '../../lib/readableOn';

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

/** Whole days from one `YYYY-MM-DD` to another (read as calendar dates, not instants). */
function daysBetween(from: string, to: string): number {
    const day = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
    return Math.round((day(to) - day(from)) / 86_400_000);
}

/** How long the timeline is, as the design writes it; nothing until both dates are set (or for the same day). */
function timelineSpan(start: string, target: string): string | null {
    if (!start || !target) return null;
    const days = daysBetween(start, target);
    if (Number.isNaN(days) || days === 0) return null;
    if (days < 0) return 'Target is before start';
    if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'}`;
    const weeks = Math.round(days / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
}

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
    /** Create was pressed with no name: the reminder shows until one is typed. */
    const [tried, setTried] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);
    const nameMissing = !name.trim();
    const span = timelineSpan(startDate, targetDate);

    const create = useCreateProject();
    const members = useMembers();
    const memberList = members.data ?? [];

    async function handleSubmit() {
        setError(null);
        if (nameMissing) {
            setTried(true);
            nameRef.current?.focus();
            return;
        }
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
                {/* The project's badge as it will look: its initial on the chosen colour (P until it has a name). */}
                <span
                    data-testid="project-form-badge"
                    aria-hidden="true"
                    style={{
                        width: 44, height: 44, borderRadius: 14, background: color, border: '2px solid var(--fg)', color: readableOn(color),
                        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                >
                    {(name.trim()[0] ?? 'P').toUpperCase()}
                </span>
                <input
                    ref={nameRef}
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
                                <PriorityIcon priority={p.value} decorative />
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
                    {span && <span data-testid="project-form-span" style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg3)' }}>{span}</span>}
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
                    alignItems: 'center',
                    gap: 10,
                    marginTop: 14,
                }}
            >
                {/* Create stays pressable with no name: pressing it says what is missing, a dead button would not. */}
                {tried && nameMissing && (
                    <span role="alert" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--red-ink)' }}>Give the project a name first.</span>
                )}
                <Button variant="secondary" size="sm" onClick={onCancel} style={{ marginLeft: 'auto' }}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleSubmit} disabled={create.isPending}>Create project →</Button>
            </div>
        </div>
    );
}
