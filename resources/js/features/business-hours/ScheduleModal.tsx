import { useEffect, useState, type CSSProperties } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { WeeklyEditor } from './WeeklyEditor';
import { useCreateSchedule, useUpdateSchedule } from './hooks';
import { ApiError } from '../../lib/apiClient';
import type { Schedule, ScheduleInterval } from '../../lib/types';

const TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Australia/Sydney',
];

const fieldLabel: CSSProperties = { display: 'block', fontSize: 12, color: 'var(--fg3)', fontWeight: 500, marginBottom: 6 };

export interface ScheduleModalProps {
    open: boolean;
    schedule?: Schedule;
    onClose(): void;
}

export function ScheduleModal({ open, schedule, onClose }: ScheduleModalProps) {
    const create = useCreateSchedule();
    const update = useUpdateSchedule();
    const isEditing = !!schedule;

    const [name, setName] = useState('');
    const [timezone, setTimezone] = useState('UTC');
    const [intervals, setIntervals] = useState<ScheduleInterval[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setName(schedule?.name ?? '');
        setTimezone(schedule?.timezone ?? 'UTC');
        setIntervals(schedule?.intervals ?? []);
        setError(null);
        // Re-run only when the modal opens or the schedule being edited changes (not on every parent re-render).
    }, [open, schedule?.id]);

    const timezoneOptions = timezone && !TIMEZONES.includes(timezone) ? [...TIMEZONES, timezone] : TIMEZONES;
    const pending = create.isPending || update.isPending;
    const canSubmit = name.trim() !== '' && !pending;

    async function submit() {
        if (!canSubmit) return;
        setError(null);
        const payload = { name: name.trim(), timezone, intervals };
        try {
            if (isEditing && schedule) {
                await update.mutateAsync({ id: schedule.id, ...payload });
            } else {
                await create.mutateAsync(payload);
            }
            onClose();
        } catch (err) {
            setError(err instanceof ApiError ? err.detail : `Failed to ${isEditing ? 'update' : 'create'} schedule.`);
        }
    }

    return (
        <Modal open={open} onClose={onClose} width={560} label={isEditing ? 'Edit schedule' : 'New schedule'}>
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{isEditing ? 'Edit schedule' : 'New schedule'}</h2>

                <div>
                    <label htmlFor="schedule-name" style={fieldLabel}>Name</label>
                    <Input
                        id="schedule-name"
                        aria-label="Schedule name"
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Support hours"
                        maxLength={64}
                    />
                </div>

                <div>
                    <label htmlFor="schedule-timezone" style={fieldLabel}>Timezone</label>
                    <select
                        id="schedule-timezone"
                        aria-label="Timezone"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        style={{
                            width: '100%',
                            background: 'var(--panel)',
                            border: '1px solid var(--border)',
                            borderRadius: 9,
                            color: 'var(--fg)',
                            fontSize: 13,
                            padding: '6px 10px',
                            fontFamily: 'inherit',
                        }}
                    >
                        {timezoneOptions.map((tz) => (
                            <option key={tz} value={tz}>{tz}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <span style={fieldLabel}>Hours</span>
                    <WeeklyEditor value={intervals} onChange={setIntervals} />
                </div>

                {error && <div role="alert" style={{ color: 'var(--red)', fontSize: 12.5 }}>{error}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ border: '1px solid var(--border)', color: 'var(--fg2)', background: 'transparent', borderRadius: 9, padding: '8px 15px', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={!canSubmit}
                        style={{
                            background: 'var(--accent)',
                            color: '#fff',
                            borderRadius: 9,
                            padding: '8px 15px',
                            fontSize: 12.5,
                            fontWeight: 600,
                            border: 'none',
                            cursor: canSubmit ? 'pointer' : 'not-allowed',
                            opacity: canSubmit ? 1 : 0.5,
                            fontFamily: 'inherit',
                        }}
                    >
                        {isEditing ? 'Save changes' : 'Create schedule'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
