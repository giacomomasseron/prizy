import type { IssueLookupItem, PlanItem, PlanSuggestion } from '../../lib/types';

/**
 * The caller's local midnight with its offset (2026-10-14T00:00:00+02:00): the server reads the local day from it, so
 * "today" follows the caller's own clock.
 */
export function localDayStart(now: Date = new Date()): string {
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const offset = -midnight.getTimezoneOffset();
    const abs = Math.abs(offset);
    const pad = (n: number) => String(n).padStart(2, '0');
    const date = `${midnight.getFullYear()}-${pad(midnight.getMonth() + 1)}-${pad(midnight.getDate())}`;
    return `${date}T00:00:00${offset >= 0 ? '+' : '-'}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** 45m, 2h, 1h 30m. */
export function formatMinutes(minutes: number): string {
    const m = Math.max(0, Math.round(minutes));
    const hours = Math.floor(m / 60);
    const rest = m % 60;
    if (hours === 0) return `${rest}m`;
    return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** The times a plan row offers. */
export const TIME_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 240, 360, 480];

/** The daily focus capacities: 3 to 9 hours. */
export const CAPACITY_OPTIONS = [180, 240, 300, 360, 420, 480, 540];

/**
 * The headline under the greeting: where to start and how much is on deck, or a clear plan. `suggestions` is how
 * many could also fit today (null while unknown).
 */
export function headline(items: PlanItem[], suggestions: number | null): { lead: string; rest: string } {
    const first = items[0];
    if (!first) {
        return { lead: 'Your plan is clear.', rest: suggestions === 0 ? 'Nothing else is assigned to you.' : 'Pick something from the suggestions below.' };
    }
    const tag = first.tag ? ` (${first.tag.label})` : '';
    return { lead: `Start with ${first.issue.identifier}${tag}.`, rest: `${items.length} ${items.length === 1 ? 'thing' : 'things'} on deck.` };
}

/** The focus-time card's note: what is still free, or how far over the plan runs. */
export function capacityNote(planned: number, capacity: number): string {
    if (planned > capacity) return `Over by ${formatMinutes(planned - capacity)}. Maybe push something to tomorrow?`;
    const free = capacity - planned;
    if (free < 15) return 'Your day is full.';
    return `${formatMinutes(free)} still free. Room for one more?`;
}

/** The time planned per project, in plan order (issues with no project are left out). */
export function projectSplit(items: PlanItem[]): { project: NonNullable<PlanItem['issue']['project']>; minutes: number }[] {
    const split = new Map<string, { project: NonNullable<PlanItem['issue']['project']>; minutes: number }>();
    for (const item of items) {
        const project = item.issue.project;
        if (!project) continue;
        const entry = split.get(project.id) ?? { project, minutes: 0 };
        entry.minutes += item.minutes;
        split.set(project.id, entry);
    }
    return [...split.values()];
}

/** What the to-dos' # list offers before anything is typed: the plan in order, then the suggestions, each issue once. */
export function linkStarters(plan: PlanItem[], suggestions: PlanSuggestion[]): IssueLookupItem[] {
    const seen = new Set<string>();
    return [...plan, ...suggestions].flatMap(({ issue }) => {
        if (seen.has(issue.id)) return [];
        seen.add(issue.id);
        return [{ id: issue.id, identifier: issue.identifier, title: issue.title, status: issue.status }];
    });
}
