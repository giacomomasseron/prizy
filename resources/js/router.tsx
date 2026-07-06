import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useMe } from './auth/useAuth';
import AppLayout from './components/AppLayout';
import LoginPage from './auth/LoginPage';
import SignupPage from './auth/SignupPage';
import IssueListPage from './features/issues/IssueListPage';
import BoardPage from './features/issues/BoardPage';
import IssueDetailPage from './features/issues/IssueDetailPage';
import TeamsPage from './features/teams/TeamsPage';
import TeamDetailPage from './features/teams/TeamDetailPage';
import ProjectsPage from './features/projects/ProjectsPage';
import ProjectDetailPage from './features/projects/ProjectDetailPage';
import LabelsSettingsPage from './features/labels/LabelsSettingsPage';
import RoadmapPage from './features/roadmap/RoadmapPage';
import NotificationsPage from './features/notifications/NotificationsPage';
import SearchPage from './features/search/SearchPage';
import IntegrationsSettingsPage from './features/integrations/IntegrationsSettingsPage';
import CreateScreen from './features/create/CreateScreen';
import SettingsLayout, { RequireManage, StubPage } from './features/settings/SettingsLayout';
import MembersPage from './features/members/MembersPage';
import TeamsSettingsPage from './features/teams/TeamsSettingsPage';
import GeneralPage from './features/settings/GeneralPage';
import { ConfirmProvider } from './components/ui/ConfirmProvider';

function RequireAuth({ children }: { children: ReactElement }) {
    const me = useMe();
    if (me.isLoading) return <p className="p-8">Loading…</p>;
    if (me.isError) return <Navigate to="/login" replace />;
    return children;
}

function AuthedLayout() {
    return (
        <RequireAuth>
            <ConfirmProvider>
                <AppLayout />
            </ConfirmProvider>
        </RequireAuth>
    );
}

export default function AppRouter() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route element={<AuthedLayout />}>
                <Route path="/" element={<IssueListPage />} />
                <Route path="/board" element={<BoardPage />} />
                <Route path="/issues/:id" element={<IssueDetailPage />} />
                <Route path="/teams" element={<TeamsPage />} />
                <Route path="/teams/:id" element={<TeamDetailPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:id" element={<ProjectDetailPage />} />
                <Route path="/labels" element={<Navigate to="/settings/labels" replace />} />
                <Route path="/roadmap" element={<RoadmapPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsLayout />}>
                    <Route index element={<Navigate to="members" replace />} />
                    <Route path="members" element={<RequireManage><MembersPage /></RequireManage>} />
                    <Route path="teams" element={<RequireManage><TeamsSettingsPage /></RequireManage>} />
                    <Route path="general" element={<GeneralPage />} />
                    <Route path="labels" element={<LabelsSettingsPage />} />
                    <Route path="integrations" element={<RequireManage><IntegrationsSettingsPage /></RequireManage>} />
                    <Route path="billing" element={<StubPage title="Billing" />} />
                    <Route path="audit" element={<StubPage title="Audit log" />} />
                </Route>
                <Route path="/search" element={<SearchPage />} />
                <Route path="/integrations" element={<Navigate to="/settings/integrations" replace />} />
                <Route path="/create" element={<CreateScreen />} />
            </Route>
        </Routes>
    );
}
