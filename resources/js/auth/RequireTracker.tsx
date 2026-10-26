import { Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { homePathFor, trackerEnabled } from './capabilities';
import { useMe } from './useAuth';

/**
 * The pages that are open to every member but exist only for the tracker: an issue opened over the support bridge,
 * and notifications. A workspace that has switched the tracker off answers 404 on them, so send the user home instead.
 */
export function RequireTracker({ children }: { children: ReactElement }) {
    const me = useMe();
    if (me.isLoading) return <p className="p-8">Loading…</p>;
    if (!trackerEnabled(me.data)) return <Navigate to={homePathFor(me.data)} replace />;
    return children;
}
