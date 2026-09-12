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
import CyclesPage from './features/cycles/CyclesPage';
import ProjectsPage from './features/projects/ProjectsPage';
import ProjectWorkspace from './features/projects/ProjectWorkspace';
import ProjectOverview from './features/projects/ProjectOverview';
import ProjectIssues from './features/projects/ProjectIssues';
import ProjectCycles from './features/projects/ProjectCycles';
import ProjectRoadmap from './features/projects/ProjectRoadmap';
import LabelsSettingsPage from './features/labels/LabelsSettingsPage';
import BusinessHoursSettingsPage from './features/business-hours/BusinessHoursSettingsPage';
import SlaPoliciesSettingsPage from './features/sla-policies/SlaPoliciesSettingsPage';
import RoadmapPage from './features/roadmap/RoadmapPage';
import AnalyticsLayout from './features/analytics/AnalyticsLayout';
import ReleasesPage from './features/releases/ReleasesPage';
import ReleaseDetailPage from './features/releases/ReleaseDetailPage';
import NotificationsPage from './features/notifications/NotificationsPage';
import SearchPage from './features/search/SearchPage';
import IntegrationsSettingsPage from './features/integrations/IntegrationsSettingsPage';
import CreateScreen from './features/create/CreateScreen';
import SettingsLayout, { RequireManage, StubPage } from './features/settings/SettingsLayout';
import MembersPage from './features/members/MembersPage';
import TeamsSettingsPage from './features/teams/TeamsSettingsPage';
import GeneralPage from './features/settings/GeneralPage';
import { ConfirmProvider } from './components/ui/ConfirmProvider';
import SupportLayout from './features/support/SupportLayout';
import ReportingLayout from './features/reporting/ReportingLayout';
import KbLibraryPage from './features/kb/KbLibraryPage';
import KbArticleEditorPage from './features/kb/KbArticleEditorPage';
import { RequireAgent } from './auth/RequireAgent';
import { RequireDeveloper } from './auth/RequireDeveloper';

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
                <Route path="/" element={<RequireDeveloper><IssueListPage /></RequireDeveloper>} />
                <Route path="/board" element={<RequireDeveloper><BoardPage /></RequireDeveloper>} />
                {/* NOT wrapped — ticket→issue bridge */}
                <Route path="/issues/:id" element={<IssueDetailPage />} />
                <Route path="/teams" element={<RequireDeveloper><TeamsPage /></RequireDeveloper>} />
                <Route path="/teams/:id" element={<RequireDeveloper><TeamDetailPage /></RequireDeveloper>} />
                <Route path="/teams/:id/cycles" element={<RequireDeveloper><CyclesPage /></RequireDeveloper>} />
                <Route path="/projects" element={<RequireDeveloper><ProjectsPage /></RequireDeveloper>} />
                <Route path="/projects/:id" element={<RequireDeveloper><ProjectWorkspace /></RequireDeveloper>}>
                    <Route index element={<ProjectOverview />} />
                    <Route path="issues" element={<ProjectIssues />} />
                    <Route path="cycles" element={<ProjectCycles />} />
                    <Route path="roadmap" element={<ProjectRoadmap />} />
                </Route>
                <Route path="/labels" element={<Navigate to="/settings/labels" replace />} />
                <Route path="/roadmap" element={<RequireDeveloper><RoadmapPage /></RequireDeveloper>} />
                <Route path="/analytics" element={<RequireDeveloper><AnalyticsLayout /></RequireDeveloper>} />
                <Route path="/releases" element={<RequireDeveloper><ReleasesPage /></RequireDeveloper>} />
                <Route path="/releases/:id" element={<RequireDeveloper><ReleaseDetailPage /></RequireDeveloper>} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsLayout />}>
                    <Route index element={<Navigate to="members" replace />} />
                    <Route path="members" element={<RequireManage><MembersPage /></RequireManage>} />
                    <Route path="teams" element={<RequireManage><TeamsSettingsPage /></RequireManage>} />
                    <Route path="general" element={<GeneralPage />} />
                    <Route path="labels" element={<LabelsSettingsPage />} />
                    <Route path="business-hours" element={<RequireAgent><BusinessHoursSettingsPage /></RequireAgent>} />
                    <Route path="sla-policies" element={<RequireAgent><SlaPoliciesSettingsPage /></RequireAgent>} />
                    <Route path="integrations" element={<RequireManage><IntegrationsSettingsPage /></RequireManage>} />
                    <Route path="billing" element={<StubPage title="Billing" />} />
                    <Route path="audit" element={<StubPage title="Audit log" />} />
                </Route>
                <Route path="/search" element={<RequireDeveloper><SearchPage /></RequireDeveloper>} />
                <Route path="/integrations" element={<Navigate to="/settings/integrations" replace />} />
                <Route path="/create" element={<RequireDeveloper><CreateScreen /></RequireDeveloper>} />
                <Route path="/support" element={<RequireAgent><SupportLayout /></RequireAgent>} />
                <Route path="/support/tickets/:id" element={<RequireAgent><SupportLayout /></RequireAgent>} />
                <Route path="/support/reporting" element={<RequireAgent><ReportingLayout /></RequireAgent>} />
                <Route path="/support/kb" element={<RequireAgent><KbLibraryPage /></RequireAgent>} />
                <Route path="/support/kb/new" element={<RequireAgent><KbArticleEditorPage /></RequireAgent>} />
                <Route path="/support/kb/articles/:id" element={<RequireAgent><KbArticleEditorPage /></RequireAgent>} />
            </Route>
        </Routes>
    );
}
