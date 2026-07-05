import { Navigate } from 'react-router-dom';

/**
 * Legacy entry point — the settings section is now a nested layout.
 * Redirect to the members sub-page; RequireManage inside the members route
 * will bounce non-admins onward to /settings/general.
 */
export default function SettingsPage() {
    return <Navigate to="/settings/members" replace />;
}
