import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import IntegrationsPage from './IntegrationsPage';

function renderPage() {
    return render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter><IntegrationsPage /></MemoryRouter>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
        const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
        if (url.includes('/integrations/slack/test')) return j(null, 202);
        if (url.includes('/integrations/slack') && (init?.method ?? 'GET') === 'PUT') return j({ data: { configured: true, is_active: true, events: ['created', 'assigned'], url_preview: '…abc123' } });
        if (url.includes('/integrations/slack')) return j({ data: { configured: true, is_active: true, events: ['created'], url_preview: '…abc123' } });
        return j({ data: {} });
    }));
});
afterEach(() => vi.unstubAllGlobals());

it('renders the Slack card and saves the selected events (omitting a blank url)', async () => {
    renderPage();
    const createdBox = await screen.findByLabelText('Issue created');
    await waitFor(() => expect((createdBox as HTMLInputElement).checked).toBe(true));

    await userEvent.click(screen.getByLabelText('Assigned')); // enable assigned
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
        const putCall = (fetch as any).mock.calls.find(([u, i]: [string, RequestInit]) => u.includes('/integrations/slack') && i?.method === 'PUT');
        expect(putCall).toBeTruthy();
        const body = JSON.parse(putCall[1].body);
        expect(body.events).toContain('assigned');
        expect(body.webhook_url).toBeUndefined(); // blank input → omitted
    });
});

it('sends a test message', async () => {
    renderPage();
    await screen.findByLabelText('Issue created');
    await userEvent.click(screen.getByRole('button', { name: /send test/i }));
    await waitFor(() => expect((fetch as any).mock.calls.some(([u]: [string]) => u.includes('/integrations/slack/test'))).toBe(true));
});
