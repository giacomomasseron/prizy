import type { Me } from '../lib/types';

/** Tracker access: is_developer OR owner (owner bypasses every policy via Gate::before). */
export function canUseTracker(me: Me | undefined): boolean {
    return !!me && (me.is_developer || me.admin_level === 'owner');
}

/**
 * Write capability for tracker resources (create/edit issues, projects, cycles, labels).
 * Owner-inclusive (owners bypass the create/update policies via Gate::before) and excludes
 * viewers (read-only). Mirrors the backend `is_developer && !viewer` gate + the owner short-circuit.
 */
export function canDevelop(me: Me | undefined): boolean {
    return canUseTracker(me) && me?.admin_level !== 'viewer';
}

/** Where a user belongs on landing / when redirected off a route they can't use. */
export function homePathFor(me: Me | undefined): string {
    if (canUseTracker(me)) return '/';
    if (me?.is_agent) return '/support';
    return '/settings';
}
