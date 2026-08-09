import { Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useMe } from './useAuth';
import { canUseTracker, homePathFor } from './capabilities';

export function RequireDeveloper({ children }: { children: ReactElement }) {
    const me = useMe();
    if (me.isLoading) return <p className="p-8">Loading…</p>;
    if (!canUseTracker(me.data)) return <Navigate to={homePathFor(me.data)} replace />;
    return children;
}
