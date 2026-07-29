import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WeeklyEditor } from './WeeklyEditor';
import type { ScheduleInterval } from '../../lib/types';

describe('WeeklyEditor', () => {
    it('renders 7 day rows and reflects the given intervals as open days', () => {
        const onChange = vi.fn();
        render(<WeeklyEditor value={[{ day_of_week: 1, opens_at: '09:00', closes_at: '17:00' }]} onChange={onChange} />);
        expect(screen.getByText('Monday')).toBeInTheDocument();
        expect(screen.getByText('Sunday')).toBeInTheDocument();
        // Monday is open with the given times
        expect(screen.getByLabelText('Monday opens')).toHaveValue('09:00');
    });

    it('emits an interval when a day is opened and times set', () => {
        const onChange = vi.fn();
        render(<WeeklyEditor value={[]} onChange={onChange} />);
        fireEvent.click(screen.getByLabelText('Tuesday open')); // toggle Tuesday open
        expect(onChange).toHaveBeenCalled();
        const last = onChange.mock.calls.at(-1)![0] as ScheduleInterval[];
        expect(last.some((i) => i.day_of_week === 2)).toBe(true);
    });
});
