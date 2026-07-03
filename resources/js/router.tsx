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
import LabelsPage from './features/labels/LabelsPage';
import RoadmapPage from './features/roadmap/RoadmapPage';
import NotificationsPage from './features/notifications/NotificationsPage';
import SettingsPage from './features/settings/SettingsPage';

function RequireAuth({ children }: { children: ReactElement }) {
    const me = useMe();
    if (me.isLoading) return <p className="p-8">Loading…</p>;
    if (me.isError) return <Navigate to="/login" replace />;
    return children;
}

function AuthedLayout() {
    return (
        <RequireAuth>
            <AppLayout />
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
                <Route path="/labels" element={<LabelsPage />} />
                <Route path="/roadmap" element={<RoadmapPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
            </Route>
        </Routes>
    );
}
