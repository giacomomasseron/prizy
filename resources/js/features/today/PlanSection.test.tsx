import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { PlanItem } from '../../lib/types';
import { PlanSection } from './PlanSection';
import { usePlan } from './planHooks';

// Today v2: Today's plan (the focus card, the rows, Working across, done today).
const ESCALATION = { id: 'p2', name: 'Escalation Engine', color: '#b06ae0' };
const METRICS = { id: 'p3', name: 'SLA & Metrics', color: '#3a9a68' };

function item(id: string, title: string, position: number, extra: Partial<PlanItem> = {}, issue: Partial<PlanItem['issue']> = {}): PlanItem {
    return {
        issue: { id, identifier: `PRZ-${id.toUpperCase()}`, title, status: 'todo', priority: 'medium', estimate: null, project: null, ...issue },
        minutes: 60, position, tag: null, reason: 'Assigned to you.', can_undo: false, ...extra,
    };
}

function j(body: unknown, status = 200) {
    return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

let items: PlanItem[];
let done: PlanItem[];
let failWrites = false;
/** Reads never answer after the first load: what the section shows then comes from its optimistic updates. */
let holdReads = false;
let loads = 0;
let failLoad = false;
let fetchMock: ReturnType<typeof vi.fn>;

/** A small in-memory /v1/me/plan. */
function stubApi() {
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url);
        const method = init?.method ?? 'GET';
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        if (method === 'GET') {
            if (failLoad) return j({ title: 'Error', detail: 'Server error' }, 500);
            if (holdReads && loads > 0) return new Promise<Response>(() => {});
            loads++;
            return j({ data: { capacity_minutes: 360, items, done_today: done } });
        }
        if (failWrites) return j({ title: 'Error', detail: 'Server error' }, 500);
        const id = u.replace(/\/done$/, '').split('/').pop();
        if (u.endsWith('/done') && method === 'POST') {
            const it = items.find((i) => i.issue.id === id)!;
            items = items.filter((i) => i !== it);
            done = [{ ...it, issue: { ...it.issue, status: 'done' }, can_undo: true }, ...done];
            return j({ data: done[0] });
        }
        if (u.endsWith('/done') && method === 'DELETE') {
            const it = done.find((i) => i.issue.id === id)!;
            done = done.filter((i) => i !== it);
            items = [...items, { ...it, can_undo: false }].sort((a, b) => a.position - b.position);
            return j(null, 204);
        }
        if (method === 'DELETE') { items = items.filter((i) => i.issue.id !== id); return j(null, 204); }
        items = items.map((i) => (i.issue.id === id ? { ...i, ...body } : i)).sort((a, b) => a.position - b.position);
        return j({ data: { ...items.find((i) => i.issue.id === id), tag: null, reason: null } });
    });
    vi.stubGlobal('fetch', fetchMock);
}

function Harness({ canDone }: { canDone: boolean }) {
    const plan = usePlan();
    return <PlanSection query={plan} plan={plan.data} canDone={canDone} />;
}

function renderSection(canDone = true) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter><Harness canDone={canDone} /></MemoryRouter></QueryClientProvider>);
}

function calls(method: string, path: string) {
    return fetchMock.mock.calls.filter(([url, init]) => String(url).endsWith(path) && (init?.method ?? 'GET') === method);
}

const rows = () => within(screen.getByRole('list', { name: 'Today’s plan' })).getAllByTestId('plan-row');
const rowTitles = () => rows().map((r) => within(r).getAllByRole('link')[0].textContent);

beforeEach(() => {
    failWrites = false;
    holdReads = false;
    failLoad = false;
    loads = 0;
    items = [
        item('a1', 'Customer data not populating on escalation', 1, { minutes: 180, tag: { label: 'SLA 2h 10m', tone: 'red' }, reason: 'Its support ticket breaches its SLA in 2h 10m.' }, { priority: 'urgent', project: ESCALATION }),
        item('b2', 'Review: SLA breach warning banner', 2, { minutes: 30, tag: { label: 'In review', tone: 'blue' }, reason: 'It’s in review.' }, { project: METRICS }),
        item('c3', 'Merge ticket and issue timelines', 3, { minutes: 100 }, { priority: 'high' }),
    ];
    done = [];
    stubApi();
});

afterEach(() => vi.unstubAllGlobals());

describe('Today v2: today\'s plan', () => {
    it('shows the open count and the first item as the focus card: Start here, its tag, Why first? and its way in', async () => {
        renderSection();
        await screen.findByText('Customer data not populating on escalation');

        expect(screen.getByTestId('plan-count')).toHaveTextContent('3');
        const focus = rows()[0];
        expect(within(focus).getByText('Start here')).toBeInTheDocument();
        expect(within(focus).getByText('SLA 2h 10m')).toBeInTheDocument();
        expect(within(focus).getByText('Why first?').parentElement).toHaveTextContent('Why first? Its support ticket breaches its SLA in 2h 10m.');
        expect(within(focus).getByRole('link', { name: 'Start working →' })).toHaveAttribute('href', '/issues/a1');
        expect(within(focus).getByRole('button', { name: 'Done' })).toBeInTheDocument();
        expect(within(focus).queryByRole('button', { name: /^Mark done/ })).toBeNull();
        expect(within(rows()[1]).queryByText('Start here')).toBeNull();
    });

    it('shows each row with its title link, tag, and the id · project · priority line', async () => {
        renderSection();
        await screen.findByText('Review: SLA breach warning banner');

        const row = rows()[1];
        expect(within(row).getByRole('link', { name: 'Review: SLA breach warning banner' })).toHaveAttribute('href', '/issues/b2');
        expect(within(row).getByText('In review')).toBeInTheDocument();
        expect(within(row).getByText('PRZ-B2')).toBeInTheDocument();
        expect(within(row).getByRole('link', { name: 'SLA & Metrics' })).toHaveAttribute('href', '/projects/p3');
        expect(within(row).getByText('Medium priority')).toBeInTheDocument();
        expect(within(rows()[0]).getByText('Urgent')).toBeInTheDocument();
        expect(within(rows()[2]).getByText('High priority')).toBeInTheDocument();
    });

    it('offers the usual times plus an item\'s own, and changes the time at once', async () => {
        holdReads = true;
        renderSection();
        await screen.findByText('Merge ticket and issue timelines');

        const select = screen.getByRole('combobox', { name: 'Time for Merge ticket and issue timelines' });
        expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['15m', '30m', '45m', '1h', '1h 30m', '1h 40m', '2h', '3h', '4h', '6h', '8h']);
        expect(select).toHaveValue('100');

        fireEvent.change(select, { target: { value: '45' } });

        await waitFor(() => expect(screen.getByRole('combobox', { name: 'Time for Merge ticket and issue timelines' })).toHaveValue('45'));
        expect(JSON.parse(String(calls('PATCH', '/me/plan/c3')[0][1].body))).toEqual({ minutes: 45 });
    });

    it('removes an item at once and hands the focus to the heading', async () => {
        holdReads = true;
        renderSection();
        await screen.findByText('Review: SLA breach warning banner');

        fireEvent.click(screen.getByRole('button', { name: 'Remove from today: Review: SLA breach warning banner' }));

        await waitFor(() => expect(rowTitles()).toEqual(['Customer data not populating on escalation', 'Merge ticket and issue timelines']));
        expect(calls('DELETE', '/me/plan/b2')).toHaveLength(1);
        expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Today’s plan' }));
    });

    it('completes an item from its circle at once; it moves to done today with Undo, and Undo puts it back', async () => {
        renderSection();
        await screen.findByText('Review: SLA breach warning banner');

        fireEvent.click(screen.getByRole('button', { name: 'Mark done: Review: SLA breach warning banner' }));

        await waitFor(() => expect(screen.getByText('Nice! 1 done today.')).toBeInTheDocument());
        expect(rowTitles()).toEqual(['Customer data not populating on escalation', 'Merge ticket and issue timelines']);
        expect(calls('POST', '/me/plan/b2/done')).toHaveLength(1);
        expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Today’s plan' }));
        const doneList = screen.getByRole('list', { name: 'Done today' });
        expect(within(doneList).getByText('Review: SLA breach warning banner')).toHaveStyle({ textDecoration: 'line-through' });

        fireEvent.click(within(doneList).getByRole('button', { name: 'Undo: Review: SLA breach warning banner' }));

        await waitFor(() => expect(rowTitles()).toEqual(['Customer data not populating on escalation', 'Review: SLA breach warning banner', 'Merge ticket and issue timelines']));
        expect(calls('DELETE', '/me/plan/b2/done')).toHaveLength(1);
        expect(screen.queryByText(/done today/)).toBeNull();
    });

    it('completes the focus item from its Done button, and the next item becomes the focus', async () => {
        renderSection();
        await screen.findByText('Customer data not populating on escalation');

        fireEvent.click(within(rows()[0]).getByRole('button', { name: 'Done' }));

        await waitFor(() => expect(within(rows()[0]).getByRole('link', { name: 'Review: SLA breach warning banner' })).toBeInTheDocument());
        expect(within(rows()[0]).getByText('Start here')).toBeInTheDocument();
        expect(calls('POST', '/me/plan/a1/done')).toHaveLength(1);
    });

    it('offers Undo only on what was completed from the plan', async () => {
        done = [
            item('d4', 'Closed from the plan', 4, { can_undo: true }, { status: 'done' }),
            item('e5', 'Closed on the board', 5, { can_undo: false }, { status: 'done' }),
        ];
        renderSection();

        expect(await screen.findByText('Nice! 2 done today.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Undo: Closed from the plan' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Undo: Closed on the board' })).toBeNull();
    });

    it('shows viewers no done controls: no circle, no Done, no Undo', async () => {
        done = [item('d4', 'Closed from the plan', 4, { can_undo: true }, { status: 'done' })];
        renderSection(false);
        await screen.findByText('Customer data not populating on escalation');

        expect(screen.queryByRole('button', { name: /^Mark done/ })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
        expect(screen.queryByRole('button', { name: /^Undo/ })).toBeNull();
        expect(screen.getByRole('button', { name: 'Remove from today: Merge ticket and issue timelines' })).toBeInTheDocument();
    });

    it('puts a failed change back and says so', async () => {
        renderSection();
        await screen.findByText('Merge ticket and issue timelines');
        failWrites = true;

        fireEvent.click(screen.getByRole('button', { name: 'Remove from today: Merge ticket and issue timelines' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('That change didn’t save. Try again.');
        expect(rowTitles()).toEqual(['Customer data not populating on escalation', 'Review: SLA breach warning banner', 'Merge ticket and issue timelines']);
    });

    it('shows the projects the plan spans, with the time on each', async () => {
        items = [...items, item('f6', 'More escalation work', 6, { minutes: 45 }, { project: ESCALATION })];
        renderSection();
        await screen.findByText('Working across');

        const escalation = screen.getByRole('link', { name: 'Escalation Engine 3h 45m' });
        expect(escalation).toHaveAttribute('href', '/projects/p2');
        expect(screen.getByRole('link', { name: 'SLA & Metrics 30m' })).toBeInTheDocument();
    });

    it('hides Working across when no item has a project', async () => {
        items = [item('c3', 'Merge ticket and issue timelines', 3)];
        renderSection();
        await screen.findByText('Merge ticket and issue timelines');

        expect(screen.queryByText('Working across')).toBeNull();
    });

    it('says "Nothing planned yet" for an empty plan', async () => {
        items = [];
        renderSection();

        expect(await screen.findByText('Nothing planned yet. Pick something from the suggestions below.')).toBeInTheDocument();
        expect(screen.getByTestId('plan-count')).toHaveTextContent('0');
    });

    it('offers Retry when the plan cannot load', async () => {
        failLoad = true;
        renderSection();

        expect(await screen.findByText('Couldn\'t load your plan.')).toBeInTheDocument();
        failLoad = false;
        fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
        expect(await screen.findByText('Customer data not populating on escalation')).toBeInTheDocument();
    });

    it('shows no empty Why first? when the focus item has no reason', async () => {
        items = [item('a1', 'Just put back', 1, { reason: null })];
        renderSection();
        await screen.findByText('Just put back');

        expect(within(rows()[0]).getByRole('link', { name: 'Start working →' })).toBeInTheDocument();
        expect(screen.queryByText('Why first?')).toBeNull();
    });
});

describe('Today v2: reordering the plan', () => {
    it('gives every item a Reorder handle that dnd-kit drives from the keyboard, with the hint', async () => {
        renderSection();
        await screen.findByText('Customer data not populating on escalation');

        expect(screen.getByText('Drag to reorder — the top one is your focus.')).toBeInTheDocument();
        expect(rows().map((r) => within(r).getAllByRole('button', { name: 'Reorder' }).length)).toEqual([1, 1, 1]);
        const handle = within(rows()[0]).getByRole('button', { name: 'Reorder' });
        expect(handle).toHaveAttribute('aria-roledescription', 'sortable');
        const help = document.getElementById(handle.getAttribute('aria-describedby') ?? '');
        expect(help?.textContent).toContain('press Space on its Reorder button');
    });

    it('moves the focus item down with the keyboard (Space, ↓, Space), at once, sends the midpoint and names it by its title', async () => {
        // jsdom has no layout: give each row a box by its place in the list, so dnd-kit can measure and move.
        const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
            const all = Array.from(document.querySelectorAll('[data-testid="plan-row"]'));
            const i = all.indexOf(this.closest('[data-testid="plan-row"]') as Element);
            const top = Math.max(i, 0) * 60;
            return { x: 0, y: top, top, left: 0, bottom: top + 60, right: 600, width: 600, height: 60, toJSON: () => ({}) } as DOMRect;
        });
        try {
            holdReads = true;
            renderSection();
            await screen.findByText('Customer data not populating on escalation');
            const tick = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

            const handle = within(rows()[0]).getByRole('button', { name: 'Reorder' });
            handle.focus();
            fireEvent.keyDown(handle, { key: ' ', code: 'Space' });
            await tick();
            fireEvent.keyDown(handle, { key: 'ArrowDown', code: 'ArrowDown' });
            await tick();
            fireEvent.keyDown(handle, { key: ' ', code: 'Space' });

            await waitFor(() => expect(calls('PATCH', '/me/plan/a1')).toHaveLength(1));
            const live = Array.from(document.querySelectorAll('[aria-live]')).map((n) => n.textContent).join(' ');
            expect(live).toContain('Dropped “Customer data not populating on escalation” at position 2 of 3.');
            expect(JSON.parse(String(calls('PATCH', '/me/plan/a1')[0][1].body))).toEqual({ position: 2.5 });
            await waitFor(() => expect(rowTitles()).toEqual(['Review: SLA breach warning banner', 'Customer data not populating on escalation', 'Merge ticket and issue timelines']));
            expect(within(rows()[0]).getByText('Start here')).toBeInTheDocument();
        } finally {
            rect.mockRestore();
        }
    });
});
