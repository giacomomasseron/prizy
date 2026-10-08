import type { ScheduleInterval } from '../../lib/types';
import { FIELD_CLASSES } from '../../components/ui/Input';
import { checkboxStyle, timeInputStyle } from '../settings/settingsStyles';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_OPENS = '09:00';
const DEFAULT_CLOSES = '17:00';

export interface WeeklyEditorProps {
    value: ScheduleInterval[];
    onChange: (value: ScheduleInterval[]) => void;
}

export function WeeklyEditor({ value, onChange }: WeeklyEditorProps) {
    const byDay = new Map(value.map((interval) => [interval.day_of_week, interval]));

    function updateDay(dayOfWeek: number, patch: Partial<ScheduleInterval> | null) {
        const next = value.filter((interval) => interval.day_of_week !== dayOfWeek);
        if (patch !== null) {
            const existing = byDay.get(dayOfWeek);
            next.push({
                day_of_week: dayOfWeek,
                opens_at: existing?.opens_at ?? DEFAULT_OPENS,
                closes_at: existing?.closes_at ?? DEFAULT_CLOSES,
                ...patch,
            });
        }
        next.sort((a, b) => a.day_of_week - b.day_of_week);
        onChange(next);
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DAY_NAMES.map((dayName, dayOfWeek) => {
                const interval = byDay.get(dayOfWeek);
                const isOpen = interval !== undefined;
                const timeStyle = { ...timeInputStyle, opacity: isOpen ? 1 : 0.5 };
                return (
                    <div key={dayName} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, width: 130, cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                aria-label={`${dayName} open`}
                                checked={isOpen}
                                onChange={(e) => updateDay(dayOfWeek, e.target.checked ? {} : null)}
                                style={checkboxStyle}
                            />
                            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)' }}>{dayName}</span>
                        </label>
                        <input
                            type="time"
                            aria-label={`${dayName} opens`}
                            value={interval?.opens_at ?? DEFAULT_OPENS}
                            disabled={!isOpen}
                            onChange={(e) => updateDay(dayOfWeek, { opens_at: e.target.value })}
                            className={FIELD_CLASSES}
                            style={timeStyle}
                        />
                        <span style={{ fontSize: 12.5, color: 'var(--fg3)' }}>to</span>
                        <input
                            type="time"
                            aria-label={`${dayName} closes`}
                            value={interval?.closes_at ?? DEFAULT_CLOSES}
                            disabled={!isOpen}
                            onChange={(e) => updateDay(dayOfWeek, { closes_at: e.target.value })}
                            className={FIELD_CLASSES}
                            style={timeStyle}
                        />
                    </div>
                );
            })}
        </div>
    );
}
