import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useMe } from './auth/useAuth';
import LoginPage from './auth/LoginPage';
import SignupPage from './auth/SignupPage';
import IssueListPage from './features/issues/IssueListPage';
import BoardPage from './features/issues/BoardPage';
import IssueDetailPage from './features/issues/IssueDetailPage';

function RequireAuth({ children }: { children: ReactElement }) {
    const me = useMe();
    if (me.isLoading) return <p className="p-8">Loading…</p>;
    if (me.isError) return <Navigate to="/login" replace />;
    return children;
}

export default function AppRouter() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/" element={<RequireAuth><IssueListPage /></RequireAuth>} />
            <Route path="/board" element={<RequireAuth><BoardPage /></RequireAuth>} />
            <Route path="/issues/:id" element={<RequireAuth><IssueDetailPage /></RequireAuth>} />
        </Routes>
    );
}
