import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PlanItem } from '../../lib/types';
import { FocusTimeCard } from './FocusTimeCard';
import { usePlan } from './planHooks';

// Today v2: the Focus time planned card.
function item(id: string, minutes: number): PlanItem {
    return {
        issue: { id, identifier: `PRZ-${id.toUpperCase()}`, title: id, status: 'todo', priority: 'medium', estimate: null, project: null },
        minutes, position: 1, tag: null, reason: null, can_undo: false,
    };
}

function j(body: unknown, status = 200) {
    return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

let fetchMock: ReturnType<typeof vi.fn>;

/** GET /me/plan answers the plan once (later reads never answer); PUT capacity answers `write`, or never. */
function renderCard(minutes: number[], write: 'ok' | 'fail' | 'hold' = 'hold') {
    let loaded = false;
    fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        if ((init?.method ?? 'GET') === 'GET') {
            if (loaded) return new Promise<Response>(() => {});
            loaded = true;
            return j({ data: { capacity_minutes: 360, items: minutes.map((m, i) => item(`i${i}`, m)), done_today: [] } });
        }
        if (write === 'fail') return j({ title: 'Error', detail: 'Server error' }, 500);
        if (write === 'hold') return new Promise<Response>(() => {});
        return j({ data: { capacity_minutes: JSON.parse(String(init?.body)).minutes } });
    });
    vi.stubGlobal('fetch', fetchMock);
    function Harness() {
        const plan = usePlan();
        return plan.data ? <FocusTimeCard plan={plan.data} /> : null;
    }
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(<QueryClientProvider client={qc}><Harness /></QueryClientProvider>);
}

afterEach(() => vi.unstubAllGlobals());

describe('Today v2: the focus-time card', () => {
    it('adds up the planned time against the capacity, with a green bar and what is still free', async () => {
        renderCard([180, 60, 30]);

        expect(await screen.findByTestId('focus-planned')).toHaveTextContent('4h 30m / 6h');
        expect(screen.getByRole('heading', { name: 'Focus time planned' })).toBeInTheDocument();
        expect(screen.getByTestId('focus-bar')).toHaveStyle({ width: '75%', background: 'var(--green)' });
        expect(screen.getByText('1h 30m still free. Room for one more?')).toBeInTheDocument();
    });

    it('turns the bar red and full, and says how far over, once the plan runs past the capacity', async () => {
        renderCard([240, 120, 45]);

        expect(await screen.findByTestId('focus-planned')).toHaveTextContent('6h 45m / 6h');
        expect(screen.getByTestId('focus-bar')).toHaveStyle({ width: '100%', background: 'var(--red)' });
        expect(screen.getByText('Over by 45m. Maybe push something to tomorrow?')).toBeInTheDocument();
    });

    it('says the day is full when less than 15 minutes are free', async () => {
        renderCard([240, 110]);

        expect(await screen.findByText('Your day is full.')).toBeInTheDocument();
    });

    it('changes the daily focus time at once, from 3h to 9h', async () => {
        renderCard([180]);
        const select = await screen.findByRole('combobox', { name: 'Daily focus time' });

        expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['3h', '4h', '5h', '6h', '7h', '8h', '9h']);
        expect(select).toHaveValue('360');

        fireEvent.change(select, { target: { value: '240' } });

        await waitFor(() => expect(screen.getByTestId('focus-planned')).toHaveTextContent('3h / 4h'));
        const put = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/me/plan/capacity') && init?.method === 'PUT');
        expect(JSON.parse(String(put?.[1]?.body))).toEqual({ minutes: 240 });
    });

    it('puts the capacity back and says so when the change fails', async () => {
        renderCard([180], 'fail');
        const select = await screen.findByRole('combobox', { name: 'Daily focus time' });

        fireEvent.change(select, { target: { value: '480' } });

        expect(await screen.findByRole('alert')).toHaveTextContent('That change didn’t save. Try again.');
        expect(screen.getByTestId('focus-planned')).toHaveTextContent('3h / 6h');
        expect(screen.getByRole('combobox', { name: 'Daily focus time' })).toHaveValue('360');
    });
});
