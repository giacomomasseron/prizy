import { useState } from 'react';
import { useSchedules, useDeleteSchedule } from './hooks';
import { ScheduleModal } from './ScheduleModal';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { Button } from '../../components/ui/Button';
import { QueryState } from '../../components/ui/QueryState';
import { ApiError } from '../../lib/apiClient';
import type { Schedule } from '../../lib/types';
import { DELETE_X_CLASSES, deleteXStyle, emptyState } from '../projects/projectStyles';
import { ROW_CLASSES, listCard, pageFrame, pageLead, pageTitle, titleRow } from '../settings/settingsStyles';

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
        <div style={pageFrame}>
            <div style={titleRow}>
                <div>
                    <h1 style={pageTitle}><span className="hl">Business hours</span></h1>
                    <p style={pageLead}>
                        Schedules define when your team is available and are used to calculate SLA due dates.
                    </p>
                </div>
                <Button onClick={openCreate} style={{ marginLeft: 'auto', flexShrink: 0 }}>
                    New schedule
                </Button>
            </div>

            {error && <p role="alert" style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--red-ink)' }}>{error}</p>}

            <QueryState query={schedulesQ} what="schedules">
                {schedules.length === 0 && (
                    <div style={{ ...emptyState, marginTop: 20 }}>No schedules yet.</div>
                )}

                {schedules.length > 0 && (
                    <div style={{ ...listCard, marginTop: 20 }}>
                        {schedules.map((s) => (
                            <div
                                key={s.id}
                                data-testid={`schedule-row-${s.id}`}
                                className={ROW_CLASSES}
                                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)', overflowWrap: 'anywhere' }}>{s.name}</span>
                                    <span style={{ fontSize: 12, color: 'var(--fg3)', overflowWrap: 'anywhere' }}>{s.timezone} · {summarizeIntervals(s)}</span>
                                </div>
                                <span style={{ flex: 1 }} />
                                <Button variant="secondary" size="sm" data-testid={`edit-${s.id}`} onClick={() => openEdit(s)}>
                                    Edit
                                </Button>
                                <button
                                    type="button"
                                    title="Delete"
                                    data-testid={`delete-${s.id}`}
                                    onClick={() => remove(s)}
                                    className={DELETE_X_CLASSES}
                                    style={{ ...deleteXStyle, width: 24, height: 24, padding: 0, flexShrink: 0 }}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </QueryState>

            <ScheduleModal open={modalOpen} schedule={editing} onClose={closeModal} />
        </div>
    );
}
