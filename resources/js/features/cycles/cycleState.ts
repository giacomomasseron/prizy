export type CycleState = 'active' | 'upcoming' | 'completed';

function dayMs(iso: string): number {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
}

export function cycleState(startsAt: string, endsAt: string, today: Date): CycleState {
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    if (t0 < dayMs(startsAt)) return 'upcoming';
    if (t0 > dayMs(endsAt)) return 'completed';
    return 'active';
}
