import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RequireDeveloper } from './RequireDeveloper';
import type { Me } from '../lib/types';

const base: Me = {
    id: 'u1', workspace_id: 'w1', name: 'A', email: 'a@e.com',
    admin_level: 'member', is_developer: false, is_agent: false, email_digest_frequency: 'off',
};

vi.mock('./useAuth', () => ({ useMe: () => mockMe }));
let mockMe: { data?: Me; isLoading: boolean };

function renderAt(me: { data?: Me; isLoading: boolean }) {
    mockMe = me;
    return render(
        <MemoryRouter initialEntries={['/']}>
            <Routes>
                <Route path="/" element={<RequireDeveloper><div>TRACKER</div></RequireDeveloper>} />
                <Route path="/support" element={<div>DESK</div>} />
                <Route path="/settings" element={<div>SETTINGS</div>} />
            </Routes>
        </MemoryRouter>,
    );
}

describe('RequireDeveloper', () => {
    it('renders children for a developer', () => {
        renderAt({ data: { ...base, is_developer: true }, isLoading: false });
        expect(screen.getByText('TRACKER')).toBeInTheDocument();
    });
    it('redirects an agent-only user to the support desk', () => {
        renderAt({ data: { ...base, is_agent: true }, isLoading: false });
        expect(screen.getByText('DESK')).toBeInTheDocument();
    });
    it('redirects a no-capability member to settings', () => {
        renderAt({ data: base, isLoading: false });
        expect(screen.getByText('SETTINGS')).toBeInTheDocument();
    });
});
