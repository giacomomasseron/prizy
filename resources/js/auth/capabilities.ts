import type { Me } from '../lib/types';

/**
 * Is the tracker switched on for the user's workspace? Mirrors EnsureTrackerEnabled, which closes it for everyone,
 * the owner included. Gates what exists only for the tracker, for every member: notifications, search, the bridge.
 * Only an explicit `false` turns it off: only /v1/me carries the switch, the tracker ran before there was one, and
 * everything inside the app shell renders after `me` has loaded (RequireAuth).
 */
export function trackerEnabled(me: Me | undefined): boolean {
    return me?.workspace?.tracker_enabled !== false;
}

/** Tracker access: the workspace switch, then is_developer OR owner (owner bypasses every policy via Gate::before). */
export function canUseTracker(me: Me | undefined): boolean {
    return !!me && trackerEnabled(me) && (me.is_developer || me.admin_level === 'owner');
}

/**
 * Write capability for tracker resources (create/edit issues, projects, cycles, labels).
 * Owner-inclusive (owners bypass the create/update policies via Gate::before) and excludes
 * viewers (read-only). Mirrors the backend `is_developer && !viewer` gate + the owner short-circuit.
 */
export function canDevelop(me: Me | undefined): boolean {
    return canUseTracker(me) && me?.admin_level !== 'viewer';
}

/**
 * Support access: the is_agent capability AND the workspace-level switch. Mirrors
 * User::canWorkHelpdesk() on the backend, including the absence of an owner bypass
 * — an owner who isn't an agent has no desk access there either.
 */
export function canWorkHelpdesk(me: Me | undefined): boolean {
    return !!me && me.is_agent && me.workspace?.helpdesk_enabled === true;
}

/**
 * Desk write capability: create, reply to, move or assign a ticket, add a contact. Mirrors
 * User::canWriteHelpdesk() — working the desk, minus viewers (read-only in every module).
 */
export function canWriteHelpdesk(me: Me | undefined): boolean {
    return canWorkHelpdesk(me) && me?.admin_level !== 'viewer';
}

/** Where a user belongs on landing / when redirected off a route they can't use. Tracker users: Today (P7-B). */
export function homePathFor(me: Me | undefined): string {
    if (canUseTracker(me)) return '/today';
    if (canWorkHelpdesk(me)) return '/support';
    return '/settings';
}
