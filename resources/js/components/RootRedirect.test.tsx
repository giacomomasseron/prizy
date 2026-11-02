import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RootRedirect } from './RootRedirect';

// `/` is the tracker's front door: Today. The issue list lives at /issues.
function Where() {
    const { pathname, search } = useLocation();
    return <p>at {pathname + search}</p>;
}

function renderAt(path: string) {
    render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/today" element={<Where />} />
                <Route path="/issues" element={<Where />} />
            </Routes>
        </MemoryRouter>,
    );
}

describe('RootRedirect', () => {
    it('sends / to Today', () => {
        renderAt('/');
        expect(screen.getByText('at /today')).toBeInTheDocument();
    });

    it('sends an old issue-list link with filters to the issue list, filters kept', () => {
        renderAt('/?assignee_id=u1&status=todo');
        expect(screen.getByText('at /issues?assignee_id=u1&status=todo')).toBeInTheDocument();
    });
});
