import { Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { canWorkHelpdesk, homePathFor } from './capabilities';
import { useMe } from './useAuth';

export function RequireAgent({ children }: { children: ReactElement }) {
    const me = useMe();
    if (me.isLoading) return <p className="p-8">Loading…</p>;
    // Redirect to wherever this user does belong: an agent-only user in a workspace
    // that has switched the helpdesk off has no tracker to fall back to.
    if (!canWorkHelpdesk(me.data)) return <Navigate to={homePathFor(me.data)} replace />;
    return children;
}
