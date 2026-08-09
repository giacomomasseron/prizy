import type { Me } from '../lib/types';

/** Tracker access: is_developer OR owner (owner bypasses every policy via Gate::before). */
export function canUseTracker(me: Me | undefined): boolean {
    return !!me && (me.is_developer || me.admin_level === 'owner');
}

/** Where a user belongs on landing / when redirected off a route they can't use. */
export function homePathFor(me: Me | undefined): string {
    if (canUseTracker(me)) return '/';
    if (me?.is_agent) return '/support';
    return '/settings';
}
