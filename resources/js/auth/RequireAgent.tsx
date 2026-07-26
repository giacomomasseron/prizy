import { Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useMe } from './useAuth';

export function RequireAgent({ children }: { children: ReactElement }) {
    const me = useMe();
    if (me.isLoading) return <p className="p-8">Loading…</p>;
    if (!me.data?.is_agent) return <Navigate to="/" replace />;
    return children;
}
