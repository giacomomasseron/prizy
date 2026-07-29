import { useState } from 'react';
import { useSchedules, useDeleteSchedule } from './hooks';
import { ScheduleModal } from './ScheduleModal';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { ApiError } from '../../lib/apiClient';
import type { Schedule } from '../../lib/types';

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Groups a schedule's intervals into compact runs, e.g. "Mon–Fri 09:00–17:00, Sat 10:00–14:00". */
function summarizeIntervals(schedule: Schedule): string {
    if (schedule.intervals.length === 0) return 'Closed all week';
    const sorted = [...schedule.intervals].sort((a, b) => a.day_of_week - b.day_of_week);
    const groups: { start: number; end: number; opens_at: string; closes_at: string }[] = [];
    for (const interval of sorted) {
        const last = groups[groups.length - 1];
        if (last && last.end === interval.day_of_week - 1 && last.opens_at === interval.opens_at && last.closes_at === interval.closes_at) {
            last.end = interval.day_of_week;
        } else {
            groups.push({ start: interval.day_of_week, end: interval.day_of_week, opens_at: interval.opens_at, closes_at: interval.closes_at });
        }
    }
    return groups
        .map((g) => {
            const days = g.start === g.end ? DAY_ABBR[g.start] : `${DAY_ABBR[g.start]}–${DAY_ABBR[g.end]}`;
            return `${days} ${g.opens_at}–${g.closes_at}`;
        })
        .join(', ');
}

export default function BusinessHoursSettingsPage() {
    const schedulesQ = useSchedules();
    const del = useDeleteSchedule();
    const confirm = useConfirm();

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Schedule | undefined>(undefined);
    const [error, setError] = useState('');

    const schedules = schedulesQ.data ?? [];

    function openCreate() {
        setEditing(undefined);
        setError('');
        setModalOpen(true);
    }

    function openEdit(schedule: Schedule) {
        setEditing(schedule);
        setError('');
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setEditing(undefined);
    }

    async function remove(schedule: Schedule) {
        setError('');
        if (!(await confirm({ title: `Delete schedule "${schedule.name}"?`, danger: true }))) return;
        del.mutateAsync(schedule.id).catch((err) =>
            setError(err instanceof ApiError ? err.detail : 'Failed to delete schedule.'));
    }

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 30px 80px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 21, fontWeight: 600, letterSpacing: '-.02em' }}>Business hours</h1>
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--fg2)', maxWidth: 600 }}>
                        Schedules define when your team is available and are used to calculate SLA due dates.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={openCreate}
                    style={{ marginLeft: 'auto', border: 'none', background: 'var(--accent)', color: '#fff', padding: '9px 15px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                >
                    New schedule
                </button>
            </div>

            {error && <p role="alert" style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--red)' }}>{error}</p>}

            {schedulesQ.isLoading && <p style={{ color: 'var(--fg3)' }}>Loading…</p>}
            {!schedulesQ.isLoading && schedules.length === 0 && (
                <p style={{ color: 'var(--fg3)', fontSize: 13, marginTop: 20 }}>No schedules yet.</p>
            )}

            {schedules.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginTop: 20 }}>
                    {schedules.map((s) => (
                        <div
                            key={s.id}
                            data-testid={`schedule-row-${s.id}`}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: 13.5, fontWeight: 500 }}>{s.name}</span>
                                <span style={{ fontSize: 11.5, color: 'var(--fg3)' }}>{s.timezone} · {summarizeIntervals(s)}</span>
                            </div>
                            <span style={{ flex: 1 }} />
                            <button
                                type="button"
                                data-testid={`edit-${s.id}`}
                                onClick={() => openEdit(s)}
                                style={{ border: '1px solid var(--border)', color: 'var(--fg2)', background: 'transparent', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                title="Delete"
                                data-testid={`delete-${s.id}`}
                                onClick={() => remove(s)}
                                style={{ border: 'none', background: 'none', color: 'var(--fg3)', cursor: 'pointer', width: 24, height: 24, borderRadius: 6, fontSize: 15, lineHeight: 1 }}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <ScheduleModal open={modalOpen} schedule={editing} onClose={closeModal} />
        </div>
    );
}
