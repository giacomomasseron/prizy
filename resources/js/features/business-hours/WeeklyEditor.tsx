import type { ScheduleInterval } from '../../lib/types';

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
        <div className="flex flex-col gap-2">
            {DAY_NAMES.map((dayName, dayOfWeek) => {
                const interval = byDay.get(dayOfWeek);
                const isOpen = interval !== undefined;
                return (
                    <div key={dayName} className="flex items-center gap-3">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                aria-label={`${dayName} open`}
                                checked={isOpen}
                                onChange={(e) => updateDay(dayOfWeek, e.target.checked ? {} : null)}
                            />
                            <span className="w-24">{dayName}</span>
                        </label>
                        <input
                            type="time"
                            aria-label={`${dayName} opens`}
                            value={interval?.opens_at ?? DEFAULT_OPENS}
                            disabled={!isOpen}
                            onChange={(e) => updateDay(dayOfWeek, { opens_at: e.target.value })}
                        />
                        <span>to</span>
                        <input
                            type="time"
                            aria-label={`${dayName} closes`}
                            value={interval?.closes_at ?? DEFAULT_CLOSES}
                            disabled={!isOpen}
                            onChange={(e) => updateDay(dayOfWeek, { closes_at: e.target.value })}
                        />
                    </div>
                );
            })}
        </div>
    );
}
