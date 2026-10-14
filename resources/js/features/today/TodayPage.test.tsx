import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import TodayPage from './TodayPage';

// P7-B: Today, the tracker user's home (the Today v2 design's header).
function j(body: unknown) {
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function renderToday() {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        const u = String(url);
        if (u.endsWith('/me')) return j({ data: { id: 'me', name: 'Alex Rivera', is_developer: true, admin_level: 'member', is_agent: false } });
        if (u.includes('/me/plan?')) return j({ data: { capacity_minutes: 360, items: [], done_today: [] } });
        return j({ data: [] });
    }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter><TodayPage /></MemoryRouter></QueryClientProvider>);
}

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('P7-B: the Today page', () => {
    it('greets by the local hour and first name, with the date above and "your day." on the highlighter', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 9, 10, 9, 30));
        renderToday();

        const heading = await screen.findByRole('heading', { level: 1, name: 'Morning, Alex. Here’s your day.' });
        expect(heading.querySelector('.hl')?.textContent).toBe('your day.');
        expect(screen.getByText('Saturday, October 10')).toBeInTheDocument();
    });

    it('says Evening after six', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 9, 10, 19, 0));
        renderToday();

        expect(await screen.findByRole('heading', { level: 1, name: 'Evening, Alex. Here’s your day.' })).toBeInTheDocument();
    });
});
