import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import IntegrationsPage from './IntegrationsPage';

function renderPage() {
    return render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><IntegrationsPage /></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
        const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
        if (url.includes('/integrations/slack')) return j({ data: { configured: false, is_active: true, events: ['created'], url_preview: null } });
        if (url.includes('/integrations/github') && (init?.method ?? 'GET') === 'PUT') return j({ data: { configured: true, is_active: true, move_to_done_on_merge: false, webhook_url: 'http://x/integrations/github/webhook/tok', secret_set: true } });
        if (url.includes('/integrations/github')) return j({ data: { configured: true, is_active: true, move_to_done_on_merge: true, webhook_url: 'http://x/integrations/github/webhook/tok', secret_set: true } });
        return j({ data: {} });
    }));
});
afterEach(() => vi.unstubAllGlobals());

it('shows the GitHub card with the webhook url and saves the toggle (omitting a blank secret)', async () => {
    renderPage();
    expect(await screen.findByDisplayValue('http://x/integrations/github/webhook/tok')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Move linked issue to Done on PR merge')); // toggle off
    await userEvent.click(screen.getByRole('button', { name: /save github/i }));

    await waitFor(() => {
        const put = (fetch as any).mock.calls.find(([u, i]: [string, RequestInit]) => u.includes('/integrations/github') && i?.method === 'PUT');
        expect(put).toBeTruthy();
        const body = JSON.parse(put[1].body);
        expect(body.move_to_done_on_merge).toBe(false);
        expect(body.webhook_secret).toBeUndefined(); // blank secret omitted
    });
});
