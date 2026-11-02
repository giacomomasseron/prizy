import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RequireTracker } from './RequireTracker';
import type { Me } from '../lib/types';

const base: Me = {
    id: 'u1', workspace_id: 'w1', name: 'A', email: 'a@e.com',
    admin_level: 'member', is_developer: false, is_agent: true, email_digest_frequency: 'off',
    workspace: { helpdesk_enabled: true, tracker_enabled: true },
};

vi.mock('./useAuth', () => ({ useMe: () => mockMe }));
let mockMe: { data?: Me; isLoading: boolean };

function renderAt(me: { data?: Me; isLoading: boolean }) {
    mockMe = me;
    return render(
        <MemoryRouter initialEntries={['/issues/i1']}>
            <Routes>
                <Route path="/issues/:id" element={<RequireTracker><div>ISSUE</div></RequireTracker>} />
                <Route path="/support" element={<div>DESK</div>} />
            </Routes>
        </MemoryRouter>,
    );
}

describe('RequireTracker', () => {
    // The bridge: an agent who is no developer still opens an issue linked to a ticket.
    it('lets any member in while the workspace runs the tracker', () => {
        renderAt({ data: base, isLoading: false });
        expect(screen.getByText('ISSUE')).toBeInTheDocument();
    });
    it('sends everyone home when the workspace has switched the tracker off', () => {
        renderAt({ data: { ...base, admin_level: 'owner', is_developer: true, workspace: { helpdesk_enabled: true, tracker_enabled: false } }, isLoading: false });
        expect(screen.getByText('DESK')).toBeInTheDocument();
        expect(screen.queryByText('ISSUE')).toBeNull();
    });
    it('waits while the user loads', () => {
        renderAt({ isLoading: true });
        expect(screen.getByText('Loading…')).toBeInTheDocument();
    });
});
