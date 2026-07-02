import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LabelsPage from './LabelsPage';

function renderPage() {
    const qc = new QueryClient();
    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter><LabelsPage /></MemoryRouter>
        </QueryClientProvider>,
    );
}

const meDeveloper = { id: 'u1', workspace_id: 'w1', name: 'A', email: 'a@x.co', admin_level: 'owner', is_developer: true, is_agent: false };

describe('LabelsPage', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
            if (url.includes('/v1/me')) return new Response(JSON.stringify({ data: meDeveloper }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            if (url.includes('/v1/labels') && (init?.method ?? 'GET') === 'POST') return new Response(JSON.stringify({ data: { id: 'l2', name: 'Feature', color: '#94a3b8', created_at: '', updated_at: '' } }), { status: 201, headers: { 'Content-Type': 'application/json' } });
            return new Response(JSON.stringify({ data: [], links: { next: null, prev: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('creates a label via the inline form', async () => {
        renderPage();
        await userEvent.type(await screen.findByLabelText('Label name'), 'Feature');
        await userEvent.click(screen.getByRole('button', { name: 'Add label' }));
        await vi.waitFor(() => {
            const calls = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;
            expect(calls.some(([u, i]) => u.includes('/v1/labels') && i?.method === 'POST')).toBe(true);
        });
    });
});
