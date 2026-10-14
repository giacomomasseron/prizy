import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { PlanItem, PlanSuggestion } from '../../lib/types';
import TodayPage from './TodayPage';

// P7-B: Today, the tracker user's home (the Today v2 design's header).
function j(body: unknown) {
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function issue(id: string, title: string): PlanItem['issue'] {
    return { id, identifier: `PRZ-${id.toUpperCase()}`, title, status: 'todo', priority: 'medium', estimate: null, project: null };
}

function renderToday(items: PlanItem[] = [], suggestions: PlanSuggestion[] = []) {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        const u = String(url);
        if (u.endsWith('/me')) return j({ data: { id: 'me', name: 'Alex Rivera', is_developer: true, admin_level: 'member', is_agent: false } });
        if (u.includes('/me/plan?')) return j({ data: { capacity_minutes: 360, items, done_today: [] } });
        if (u.includes('/me/plan/suggestions?')) return j({ data: suggestions });
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

describe('Today v2: the headline', () => {
    const planned = (id: string, title: string, tag: PlanItem['tag']): PlanItem => ({ issue: issue(id, title), minutes: 60, position: 1, tag, reason: 'Assigned to you.', can_undo: false });
    const suggestion: PlanSuggestion = { issue: issue('s1', 'Suggested'), minutes: 60, tag: null, reason: 'Assigned to you.' };

    it('says where to start, with the focus item\'s tag, and how much is on deck', async () => {
        renderToday([planned('abc123', 'First', { label: 'SLA 2h 10m', tone: 'red' }), planned('def456', 'Second', null)]);

        expect(await screen.findByTestId('today-headline')).toHaveTextContent('Start with PRZ-ABC123 (SLA 2h 10m). 2 things on deck.');
        expect(screen.getByText('Start with PRZ-ABC123 (SLA 2h 10m).').tagName).toBe('STRONG');
        expect(screen.getByRole('heading', { name: 'Focus time planned' })).toBeInTheDocument();
    });

    it('calls an empty plan clear and points to the suggestions', async () => {
        renderToday([], [suggestion]);

        await waitFor(() => expect(screen.getByTestId('today-headline')).toHaveTextContent('Your plan is clear. Pick something from the suggestions below.'));
    });

    it('says nothing else is assigned when there are no suggestions either', async () => {
        renderToday([], []);

        await waitFor(() => expect(screen.getByTestId('today-headline')).toHaveTextContent('Your plan is clear. Nothing else is assigned to you.'));
    });
});

describe('Today v2: the layout', () => {
    it('puts the plan and the suggestions first, then the to-dos: the order the columns stack in at phone width', async () => {
        renderToday();
        await screen.findByRole('heading', { name: 'Focus time planned' });

        expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Focus time planned', 'Today’s plan', 'Could also fit today', 'My to-dos']);
    });
});
