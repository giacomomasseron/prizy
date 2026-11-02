import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { PlanSuggestion } from '../../lib/types';
import { PlanSection } from './PlanSection';
import { usePlan, usePlanSuggestions } from './planHooks';
import { SuggestionsSection } from './SuggestionsSection';

// Today v2: Could also fit today.
function suggestion(id: string, title: string, minutes: number, reason: string, project: PlanSuggestion['issue']['project'] = null): PlanSuggestion {
    return { issue: { id, identifier: `PRZ-${id.toUpperCase()}`, title, status: 'todo', priority: 'high', estimate: null, project }, minutes, tag: null, reason };
}

function j(body: unknown, status = 200) {
    return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

let suggestions: PlanSuggestion[];
let addWrite: 'hold' | 'fail';
let failLoad = false;
let fetchMock: ReturnType<typeof vi.fn>;

function stubApi() {
    let planLoaded = false;
    let suggestionsLoaded = false;
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url);
        if ((init?.method ?? 'GET') !== 'GET') return addWrite === 'fail' ? j({ title: 'Error', detail: 'Server error' }, 500) : new Promise<Response>(() => {});
        // Each list answers once; later reads never answer, so what shows comes from the optimistic update.
        if (u.includes('/me/plan/suggestions')) {
            if (failLoad) return j({ title: 'Error', detail: 'Server error' }, 500);
            if (suggestionsLoaded) return new Promise<Response>(() => {});
            suggestionsLoaded = true;
            return j({ data: suggestions });
        }
        if (planLoaded) return new Promise<Response>(() => {});
        planLoaded = true;
        return j({ data: { capacity_minutes: 360, items: [], done_today: [] } });
    });
    vi.stubGlobal('fetch', fetchMock);
}

function Harness() {
    const plan = usePlan();
    const list = usePlanSuggestions();
    return (
        <>
            <PlanSection query={plan} plan={plan.data} canDone />
            <SuggestionsSection query={list} suggestions={list.data} />
        </>
    );
}

function renderSections() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter><Harness /></MemoryRouter></QueryClientProvider>);
}

const suggestionRows = () => screen.getAllByTestId('suggestion-row');

beforeEach(() => {
    addWrite = 'hold';
    failLoad = false;
    suggestions = [
        suggestion('a1', 'Customer data not populating on escalation', 180, 'Its support ticket breaches its SLA in 2h 10m.', { id: 'p2', name: 'Escalation Engine', color: '#b06ae0' }),
        suggestion('b2', 'Keyboard shortcuts for triage', 150, 'Its cycle ends in 6 days.'),
    ];
    stubApi();
});

afterEach(() => vi.unstubAllGlobals());

describe('Today v2: could also fit today', () => {
    it('lists the suggestions in the server\'s order with the count, the hint, the project, the reason and the time', async () => {
        renderSections();
        await screen.findByText('Keyboard shortcuts for triage');

        expect(screen.getByTestId('suggestion-count')).toHaveTextContent('2');
        expect(screen.getByText('Ranked by urgency, cycle, and who’s waiting.')).toBeInTheDocument();
        const first = suggestionRows()[0];
        expect(within(first).getByRole('link', { name: 'Customer data not populating on escalation' })).toHaveAttribute('href', '/issues/a1');
        expect(within(first).getByText('Escalation Engine')).toBeInTheDocument();
        expect(within(first).getByText('Its support ticket breaches its SLA in 2h 10m.')).toBeInTheDocument();
        expect(within(first).getByText('3h')).toBeInTheDocument();
        expect(within(suggestionRows()[1]).getByText('2h 30m')).toBeInTheDocument();
    });

    it('adds a suggestion to the end of the plan at once, with its time, and takes it off the list', async () => {
        renderSections();
        await screen.findByText('Keyboard shortcuts for triage');

        fireEvent.click(screen.getByRole('button', { name: 'Add to today: Keyboard shortcuts for triage' }));

        const plan = await screen.findByRole('list', { name: 'Today’s plan' });
        expect(within(plan).getByRole('link', { name: 'Keyboard shortcuts for triage' })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: 'Time for Keyboard shortcuts for triage' })).toHaveValue('150');
        expect(suggestionRows()).toHaveLength(1);
        expect(screen.getByTestId('suggestion-count')).toHaveTextContent('1');
        const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
        expect(JSON.parse(String(post?.[1]?.body))).toEqual({ issue_id: 'b2', minutes: 150 });
        expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Could also fit today' }));
    });

    it('puts a failed add back and says so', async () => {
        addWrite = 'fail';
        renderSections();
        await screen.findByText('Keyboard shortcuts for triage');

        fireEvent.click(screen.getByRole('button', { name: 'Add to today: Keyboard shortcuts for triage' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('That change didn’t save. Try again.');
        await waitFor(() => expect(suggestionRows()).toHaveLength(2));
        expect(screen.getByText('Nothing planned yet. Pick something from the suggestions below.')).toBeInTheDocument();
    });

    it('says "Everything assigned to you is planned." when nothing is left', async () => {
        suggestions = [];
        renderSections();

        expect(await screen.findByText('Everything assigned to you is planned.')).toBeInTheDocument();
    });

    it('offers Retry when the suggestions cannot load', async () => {
        failLoad = true;
        renderSections();

        expect(await screen.findByText('Couldn\'t load suggestions.')).toBeInTheDocument();
    });
});
