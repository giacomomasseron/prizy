export interface MonthWindow {
    start: Date;
    end: Date;
    months: Array<{ key: string; label: string }>;
}

interface Dated {
    start_date: string | null;
    target_date: string | null;
}

function parseDate(s: string): Date {
    const [y, m, d] = s.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
}

function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function addMonths(d: Date, n: number): Date {
    return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function isScheduled<T extends Dated>(p: T): p is T & { start_date: string; target_date: string } {
    return !!p.start_date && !!p.target_date;
}

export function computeWindow(projects: Dated[], today: Date): MonthWindow {
    const scheduled = projects.filter(isScheduled);
    let start: Date;
    let end: Date;
    if (scheduled.length === 0) {
        start = startOfMonth(addMonths(today, -1));
        end = endOfMonth(addMonths(today, 6));
    } else {
        const starts = scheduled.map((p) => parseDate(p.start_date as string).getTime());
        const ends = scheduled.map((p) => parseDate(p.target_date as string).getTime());
        start = startOfMonth(new Date(Math.min(...starts)));
        end = endOfMonth(new Date(Math.max(...ends)));
    }

    const months: Array<{ key: string; label: string }> = [];
    let cur = startOfMonth(start);
    while (cur <= end) {
        months.push({ key: `${cur.getFullYear()}-${cur.getMonth() + 1}`, label: cur.toLocaleString('en-US', { month: 'short' }) });
        cur = addMonths(cur, 1);
    }
    return { start, end, months };
}

function pct(window: MonthWindow, date: Date): number {
    const span = window.end.getTime() - window.start.getTime();
    if (span <= 0) return 0;
    const raw = ((date.getTime() - window.start.getTime()) / span) * 100;
    return Math.max(0, Math.min(100, raw));
}

export function barGeometry(window: MonthWindow, start: string, target: string): { leftPct: number; widthPct: number } {
    const left = pct(window, parseDate(start));
    const right = pct(window, parseDate(target));
    return { leftPct: left, widthPct: Math.max(right - left, 1) };
}

export function markerLeft(window: MonthWindow, date: string): number {
    return pct(window, parseDate(date));
}
