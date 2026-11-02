import { Navigate, useLocation } from 'react-router-dom';

/**
 * `/` is the tracker's front door: Today (whose guard sends anyone else to their own home). A link that still carries
 * the issue list's filters (`/?assignee_id=…`, from before the list moved to `/issues`) opens the list with them.
 */
export function RootRedirect() {
    const { search } = useLocation();
    return <Navigate to={search ? `/issues${search}` : '/today'} replace />;
}
