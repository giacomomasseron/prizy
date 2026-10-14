import { useId, useState } from 'react';
import { FIELD_CLASSES } from '../../components/ui/Input';
import type { DayPlan } from '../../lib/types';
import { useSetCapacity } from './planHooks';
import { CAPACITY_OPTIONS, capacityNote, formatMinutes } from './planText';

const FAILED = 'That change didn’t save. Try again.';

/**
 * Focus time planned (the Today v2 design): the time on the plan against the daily capacity, a bar (green, red once
 * over), what is still free, and the Daily focus time select (3h–9h).
 */
export function FocusTimeCard({ plan }: { plan: DayPlan }) {
    const [error, setError] = useState('');
    const setCapacity = useSetCapacity(() => setError(FAILED));
    const headingId = useId();
    const selectId = useId();

    const planned = plan.items.reduce((sum, item) => sum + item.minutes, 0);
    const capacity = plan.capacity_minutes;
    const over = planned > capacity;
    const options = CAPACITY_OPTIONS.includes(capacity) ? CAPACITY_OPTIONS : [...CAPACITY_OPTIONS, capacity].sort((a, b) => a - b);

    return (
        <section aria-labelledby={headingId} style={{ flex: '0 1 290px', minWidth: 240, borderRadius: 'var(--radius-card)', background: 'var(--panel)', border: 'var(--line) solid var(--border)', padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <h2 id={headingId} style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Focus time planned</h2>
                <span data-testid="focus-planned" style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>
                    {formatMinutes(planned)} / {formatMinutes(capacity)}
                </span>
            </div>
            {/* The numbers above and the note below say what the bar shows. */}
            <div aria-hidden="true" style={{ height: 10, borderRadius: 'var(--radius-pill)', background: 'var(--bg2)', overflow: 'hidden', marginTop: 10 }}>
                <div
                    data-testid="focus-bar"
                    style={{ height: '100%', width: `${Math.min(100, (planned / capacity) * 100)}%`, background: over ? 'var(--red)' : 'var(--green)', borderRadius: 'var(--radius-pill)', transition: 'width .25s' }}
                />
            </div>
            <p style={{ margin: '9px 0 0', fontSize: 13.5, color: 'var(--fg3)' }}>{capacityNote(planned, capacity)}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <label htmlFor={selectId} style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg2)' }}>Daily focus time</label>
                <select
                    id={selectId}
                    value={capacity}
                    onChange={(e) => { setError(''); setCapacity.mutate(Number(e.target.value)); }}
                    className={FIELD_CLASSES}
                    style={{ marginLeft: 'auto', background: 'var(--panel)', color: 'var(--fg)', borderRadius: 'var(--radius-pill)', fontSize: 13, fontWeight: 600, padding: '3px 10px', fontFamily: 'inherit', cursor: 'pointer' }}
                >
                    {options.map((m) => <option key={m} value={m}>{formatMinutes(m)}</option>)}
                </select>
            </div>
            {error && <p role="alert" style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--red-ink)' }}>{error}</p>}
        </section>
    );
}
