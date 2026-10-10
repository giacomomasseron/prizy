import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RequireAgent } from './RequireAgent';
import type { Me } from '../lib/types';

const base: Me = {
    id: 'u1', workspace_id: 'w1', name: 'A', email: 'a@e.com',
    admin_level: 'member', is_developer: false, is_agent: false, email_digest_frequency: 'off',
    workspace: { helpdesk_enabled: true },
};

vi.mock('./useAuth', () => ({ useMe: () => mockMe }));
let mockMe: { data?: Me; isLoading: boolean };

function renderAt(me: { data?: Me; isLoading: boolean }) {
    mockMe = me;
    return render(
        <MemoryRouter initialEntries={['/support']}>
            <Routes>
                <Route path="/support" element={<RequireAgent><div>DESK</div></RequireAgent>} />
                <Route path="/today" element={<div>TODAY</div>} />
                <Route path="/settings" element={<div>SETTINGS</div>} />
            </Routes>
        </MemoryRouter>,
    );
}

describe('RequireAgent', () => {
    it('renders the desk for an agent while the workspace runs a help desk', () => {
        renderAt({ data: { ...base, is_agent: true }, isLoading: false });
        expect(screen.getByText('DESK')).toBeInTheDocument();
    });
    it('sends an agent away once the workspace switches the helpdesk off', () => {
        renderAt({ data: { ...base, is_agent: true, workspace: { helpdesk_enabled: false } }, isLoading: false });
        expect(screen.queryByText('DESK')).not.toBeInTheDocument();
        // No tracker capability either, so settings is the only place left.
        expect(screen.getByText('SETTINGS')).toBeInTheDocument();
    });
    it('sends a developer who is not an agent to Today, their home', () => {
        renderAt({ data: { ...base, is_developer: true }, isLoading: false });
        expect(screen.getByText('TODAY')).toBeInTheDocument();
    });
});
