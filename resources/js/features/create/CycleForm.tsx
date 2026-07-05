import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { Cycle } from '../../lib/types';
import { useTeams, useCreateCycle } from '../teams/hooks';
import { Button } from '../../components/ui/Button';
import { PropertyRow } from '../../components/ui/PropertyRow';
import { Switch } from '../../components/ui/Switch';
import { Textarea } from '../../components/ui/Textarea';
import { Menu } from '../../components/ui/Menu';

interface CycleFormProps {
    defaultTeamId?: string;
    onSuccess(cycle: Cycle, teamId: string): void;
    onCancel(): void;
}

function addDays(date: string, n: number): string {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

const DURATIONS = [1, 2, 3, 4];

function chipCss(active: boolean): CSSProperties {
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

const dateInputStyle: CSSProperties = {
    border: '1px solid var(--border)',
    background: 'var(--panel)',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 12.5,
    color: 'var(--fg)',
    fontFamily: 'inherit',
    outline: 'none',
};

export default function CycleForm({ defaultTeamId, onSuccess, onCancel }: CycleFormProps) {
    const [name, setName] = useState('');
    const [teamId, setTeamId] = useState(defaultTeamId ?? '');
    const [startsAt, setStartsAt] = useState('');
    const [endsAt, setEndsAt] = useState('');
    const [cooldown, setCooldown] = useState(false);
    const [description, setDescription] = useState('');
    const [activeDuration, setActiveDuration] = useState<number | null>(null);

    const teams = useTeams();
    const create = useCreateCycle(teamId);

    const selectedTeam = (teams.data?.items ?? []).find(t => t.id === teamId);

    function handleDurationClick(weeks: number) {
        const today = new Date().toISOString().slice(0, 10);
        const base = startsAt || today;
        if (!startsAt) setStartsAt(today);
        setEndsAt(addDays(base, weeks * 7));
        setActiveDuration(weeks);
    }

    function handleStartsChange(v: string) {
        setStartsAt(v);
        if (activeDuration !== null) {
            setEndsAt(addDays(v, activeDuration * 7));
        }
    }

    function handleEndsChange(v: string) {
        setEndsAt(v);
        setActiveDuration(null);
    }

    const validDates = Boolean(startsAt && endsAt && endsAt > startsAt);
    const canCreate = Boolean(name.trim() && teamId && validDates);

    async function handleSubmit() {
        const cycle = await create.mutateAsync({
            name,
            starts_at: startsAt,
            ends_at: endsAt,
            cooldown_days: cooldown ? 2 : 0,
            description,
        });
        onSuccess(cycle, teamId);
    }

    const teamItems = (teams.data?.items ?? []).map(t => ({
        key: t.id,
        label: t.name,
        onActivate: () => setTeamId(t.id),
    }));

    return (
        <div>
            {/* Header: cycle icon + name input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <span
                    aria-hidden
                    style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        border: '2px solid var(--accent)',
                        background: 'conic-gradient(var(--accent) 0deg 90deg, transparent 90deg 360deg)',
                        flexShrink: 0,
                        display: 'inline-block',
                        boxSizing: 'border-box',
                    }}
                />
                <input
                    placeholder="Cycle name"
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

            {/* Property card */}
            <div
                style={{
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                }}
            >
                {/* Team row */}
                <PropertyRow label="Team">
                    <Menu
                        trigger={
                            <button
                                type="button"
                                aria-label="Team picker"
                                style={{
                                    ...chipCss(false),
                                    color: selectedTeam ? 'var(--fg)' : 'var(--fg3)',
                                }}
                            >
                                {selectedTeam ? selectedTeam.name : 'Select team'}
                            </button>
                        }
                        items={teamItems}
                    />
                </PropertyRow>

                {divider}

                {/* Duration row */}
                <PropertyRow label="Duration">
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {DURATIONS.map(n => (
                            <button
                                key={n}
                                type="button"
                                style={chipCss(activeDuration === n)}
                                onClick={() => handleDurationClick(n)}
                            >
                                {n === 1 ? '1 week' : `${n} weeks`}
                            </button>
                        ))}
                    </div>
                </PropertyRow>

                {divider}

                {/* Starts row */}
                <PropertyRow label="Starts">
                    <input
                        type="date"
                        aria-label="Starts"
                        value={startsAt}
                        onChange={e => handleStartsChange(e.target.value)}
                        style={dateInputStyle}
                    />
                </PropertyRow>

                {divider}

                {/* Ends row */}
                <PropertyRow label="Ends">
                    <input
                        type="date"
                        aria-label="Ends"
                        value={endsAt}
                        onChange={e => handleEndsChange(e.target.value)}
                        style={dateInputStyle}
                    />
                </PropertyRow>

                {divider}

                {/* Cooldown row */}
                <PropertyRow label="Cooldown">
                    <Switch
                        checked={cooldown}
                        onChange={setCooldown}
                        ariaLabel="Cooldown"
                    />
                    <span style={{ fontSize: 13, color: 'var(--fg)' }}>2-day cooldown after cycle ends</span>
                </PropertyRow>
            </div>

            {/* Description */}
            <div style={{ marginTop: 22 }}>
                <div
                    style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--fg3)',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        marginBottom: 6,
                    }}
                >
                    Description
                </div>
                <Textarea
                    placeholder="What is the focus of this cycle?"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    style={{ height: 88, resize: 'none' }}
                />
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
                <Button
                    variant="primary"
                    size="sm"
                    disabled={!canCreate || create.isPending}
                    onClick={handleSubmit}
                >
                    Create cycle
                </Button>
            </div>
        </div>
    );
}
