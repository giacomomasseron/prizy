import { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { FIELD_CLASSES, Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { WeeklyEditor } from './WeeklyEditor';
import { useCreateSchedule, useUpdateSchedule } from './hooks';
import { ApiError } from '../../lib/apiClient';
import type { Schedule, ScheduleInterval } from '../../lib/types';
import { fieldLabel, modalBody, modalFooter, modalHeader, modalTitle, selectStyle } from '../settings/settingsStyles';

const TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Australia/Sydney',
];

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
            <div style={modalHeader}>
                <h2 style={modalTitle}>{isEditing ? 'Edit schedule' : 'New schedule'}</h2>
            </div>

            <div style={modalBody}>
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
                        className={FIELD_CLASSES}
                        style={{ ...selectStyle, width: '100%' }}
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

                {error && <div role="alert" style={{ color: 'var(--red-ink)', fontSize: 12.5 }}>{error}</div>}
            </div>

            <div style={modalFooter}>
                <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
                <Button size="sm" onClick={submit} disabled={!canSubmit}>
                    {isEditing ? 'Save changes' : 'Create schedule'}
                </Button>
            </div>
        </Modal>
    );
}
