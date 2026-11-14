import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { DndContextProps } from '@dnd-kit/core';
import type { PlanItem, PlanSuggestion } from '../../lib/types';
import { PlanDnd } from './PlanDnd';
import { PlanSection } from './PlanSection';
import { usePlan, usePlanSuggestions } from './planHooks';
import { SuggestionsSection } from './SuggestionsSection';

// Today (the 2026-11 design): dragging between the plan and "Could also fit today".
// The handlers are driven directly: a real pointer drag through dnd-kit is unreliable in jsdom.
const dnd = vi.hoisted(() => ({ props: null as unknown }));
vi.mock('@dnd-kit/core', async (orig) => {
    const real = await orig<typeof import('@dnd-kit/core')>();
    return {
        ...real,
        DndContext: (props: DndContextProps) => { dnd.props = props; return createElement(real.DndContext, props); },
        // The real overlay shows its children only during a drag dnd-kit itself started.
        DragOverlay: ({ children }: { children?: React.ReactNode }) => createElement('div', null, children),
    };
});

function item(id: string, title: string, position: number): PlanItem {
    return {
        issue: { id, identifier: `PRZ-${id.toUpperCase()}`, title, status: 'todo', priority: 'medium', estimate: null, project: null },
        minutes: 60, position, tag: null, reason: 'Assigned to you.', can_undo: false,
    };
}
function suggestion(id: string, title: string): PlanSuggestion {
    return { issue: { id, identifier: `PRZ-${id.toUpperCase()}`, title, status: 'todo', priority: 'high', estimate: null, project: null }, minutes: 45, tag: null, reason: 'Assigned to you.' };
}
function j(body: unknown, status = 200) {
    return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

let items: PlanItem[];
let suggestions: PlanSuggestion[];
let failWrites = false;
let fetchMock: ReturnType<typeof vi.fn>;
/** Every write, in the order it reached the server. */
let writes: Array<{ method: string; path: string; body: Record<string, unknown> }>;

/** Each list answers once; later reads never answer, so what shows comes from the optimistic update. */
function stubApi() {
    let planLoaded = false;
    let suggestionsLoaded = false;
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url);
        const method = init?.method ?? 'GET';
        if (method !== 'GET') {
            writes.push({ method, path: u.replace(/^.*\/v1/, ''), body: init?.body ? JSON.parse(String(init.body)) : {} });
            if (failWrites) return j({ title: 'Error', detail: 'Server error' }, 500);
            return method === 'DELETE' ? j(null, 204) : j({ data: {} });
        }
        if (u.includes('/me/plan/suggestions')) {
            if (suggestionsLoaded) return new Promise<Response>(() => {});
            suggestionsLoaded = true;
            return j({ data: suggestions });
        }
        if (planLoaded) return new Promise<Response>(() => {});
        planLoaded = true;
        return j({ data: { capacity_minutes: 360, items, done_today: [] } });
    });
    vi.stubGlobal('fetch', fetchMock);
}

function Harness() {
    const plan = usePlan();
    const list = usePlanSuggestions();
    return (
        <PlanDnd plan={plan.data} suggestions={list.data}>
            <PlanSection query={plan} plan={plan.data} canDone />
            <SuggestionsSection query={list} suggestions={list.data} />
        </PlanDnd>
    );
}

async function renderDay() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={qc}><MemoryRouter><Harness /></MemoryRouter></QueryClientProvider>);
    await screen.findByText('Could also fit today');
    await waitFor(() => expect(screen.queryAllByTestId('suggestion-row').length).toBe(suggestions.length));
    if (items.length > 0) await screen.findAllByTestId('plan-row');
}

type Handlers = Required<Pick<DndContextProps, 'onDragStart' | 'onDragMove' | 'onDragEnd' | 'onDragCancel'>>;
const handlers = () => dnd.props as Handlers;
/** A plan row as a drop target: 60px tall, by its place in the list. */
const overRow = (id: string) => {
    const index = items.findIndex((i) => i.issue.id === id);
    return { id, rect: { top: index * 60, left: 0, width: 600, height: 60, bottom: index * 60 + 60, right: 600 } };
};
const PLAN_ZONE = { id: 'zone:plan', rect: { top: 0, left: 0, width: 600, height: 400, bottom: 400, right: 600 } };
const SUGG_ZONE = { id: 'zone:suggestions', rect: { top: 500, left: 0, width: 600, height: 200, bottom: 700, right: 600 } };
/** The pointer went down at y = 0 and is now at `y`. */
const pointer = (activeId: string, over: unknown, y: number) => ({ active: { id: activeId }, over, activatorEvent: { clientY: 0 }, delta: { x: 0, y } }) as never;
const start = (id: string) => act(() => handlers().onDragStart({ active: { id } } as never));
const move = (id: string, over: unknown, y: number) => act(() => handlers().onDragMove(pointer(id, over, y)));
const drop = (id: string, over: unknown, y: number) => act(() => handlers().onDragEnd(pointer(id, over, y)));
const planRows = () => screen.queryAllByTestId('plan-row');
const planTitles = () => planRows().map((r) => within(r).getAllByRole('link')[0].textContent);
const suggestionTitles = () => screen.queryAllByTestId('suggestion-row').map((r) => within(r).getByTestId('suggestion-title').textContent);
const row = (title: string) => planRows().find((r) => within(r).queryByText(title)) as HTMLElement;

beforeEach(() => {
    failWrites = false;
    writes = [];
    items = [item('a1', 'First', 1), item('b2', 'Second', 2), item('c3', 'Third', 3)];
    suggestions = [suggestion('s1', 'Could fit one'), suggestion('s2', 'Could fit two')];
    stubApi();
});
afterEach(() => vi.unstubAllGlobals());

describe('Today: a suggestion dragged into the plan', () => {
    it('lands before the row whose top half it is dropped on: added, then moved to that place', async () => {
        await renderDay();
        await start('suggestion:s1');
        await drop('suggestion:s1', overRow('b2'), 70); // 70 is in the top half of the second row (60–120)

        expect(planTitles()).toEqual(['First', 'Could fit one', 'Second', 'Third']);
        expect(suggestionTitles()).toEqual(['Could fit two']);
        await waitFor(() => expect(writes).toHaveLength(2));
        expect(writes[0]).toEqual({ method: 'POST', path: '/me/plan', body: { issue_id: 's1', minutes: 45 } });
        expect(writes[1]).toEqual({ method: 'PATCH', path: '/me/plan/s1', body: { position: 1.5 } });
    });

    it('lands after the row whose bottom half it is dropped on', async () => {
        await renderDay();
        await start('suggestion:s2');
        await drop('suggestion:s2', overRow('a1'), 50); // the bottom half of the first row (0–60)

        expect(planTitles()).toEqual(['First', 'Could fit two', 'Second', 'Third']);
        await waitFor(() => expect(writes).toHaveLength(2));
        expect(writes[1]).toEqual({ method: 'PATCH', path: '/me/plan/s2', body: { position: 1.5 } });
    });

    it('becomes the focus when dropped on the top half of the first row', async () => {
        await renderDay();
        await start('suggestion:s1');
        await drop('suggestion:s1', overRow('a1'), 10);

        expect(planTitles()).toEqual(['Could fit one', 'First', 'Second', 'Third']);
        expect(within(planRows()[0]).getByText('Start here')).toBeInTheDocument();
        await waitFor(() => expect(writes).toHaveLength(2));
        expect(writes[1]).toEqual({ method: 'PATCH', path: '/me/plan/s1', body: { position: 0 } });
    });

    it('goes last, with no move to send, when dropped under the rows or on the last row\'s bottom half', async () => {
        await renderDay();
        await start('suggestion:s1');
        await drop('suggestion:s1', PLAN_ZONE, 300);
        expect(planTitles()).toEqual(['First', 'Second', 'Third', 'Could fit one']);

        // The row just added is the last one now (the fourth: 180–240).
        await start('suggestion:s2');
        await drop('suggestion:s2', { id: 's1', rect: { top: 180, left: 0, width: 600, height: 60, bottom: 240, right: 600 } }, 230);
        expect(planTitles()).toEqual(['First', 'Second', 'Third', 'Could fit one', 'Could fit two']);
        await waitFor(() => expect(writes).toHaveLength(2));
        expect(writes.map((w) => w.method)).toEqual(['POST', 'POST']);
    });

    it('goes onto an empty plan', async () => {
        items = [];
        await renderDay();
        const zone = screen.getByTestId('plan-zone');
        expect(zone).toHaveTextContent('Nothing planned yet. Pull something up from below.');
        expect(zone.style.outline).toBe('');
        expect(zone.style.minHeight).toBe('80px');

        await start('suggestion:s1');
        await move('suggestion:s1', PLAN_ZONE, 40);
        expect(screen.getByTestId('plan-zone').style.outline).toBe('2px dashed var(--fg)');

        await drop('suggestion:s1', PLAN_ZONE, 40);
        expect(planTitles()).toEqual(['Could fit one']);
        expect(screen.getByTestId('plan-zone').style.outline).toBe('');
        await waitFor(() => expect(writes).toEqual([{ method: 'POST', path: '/me/plan', body: { issue_id: 's1', minutes: 45 } }]));
    });

    it('stays a suggestion when dropped back on the suggestions, or nowhere', async () => {
        await renderDay();
        await start('suggestion:s1');
        await drop('suggestion:s1', SUGG_ZONE, 600);
        await start('suggestion:s1');
        await drop('suggestion:s1', null, 900);

        expect(planTitles()).toEqual(['First', 'Second', 'Third']);
        expect(suggestionTitles()).toEqual(['Could fit one', 'Could fit two']);
        expect(writes).toEqual([]);
    });

    it('puts a failed add back and says so', async () => {
        failWrites = true;
        await renderDay();
        await start('suggestion:s1');
        await drop('suggestion:s1', overRow('b2'), 70);

        expect(await screen.findByRole('alert')).toHaveTextContent('That change didn’t save. Try again.');
        await waitFor(() => expect(planTitles()).toEqual(['First', 'Second', 'Third']));
        expect(suggestionTitles()).toEqual(['Could fit one', 'Could fit two']);
    });
});

describe('Today: a plan item dragged', () => {
    it('leaves the plan when dropped on the suggestions', async () => {
        await renderDay();
        await start('b2');
        await drop('b2', SUGG_ZONE, 600);

        expect(planTitles()).toEqual(['First', 'Third']);
        await waitFor(() => expect(writes).toEqual([{ method: 'DELETE', path: '/me/plan/b2', body: {} }]));
    });

    it('moves to where the pointer drops it: before a row\'s top half, after its bottom half', async () => {
        await renderDay();
        await start('a1');
        await drop('a1', overRow('b2'), 110); // bottom half of the second row: after it
        expect(planTitles()).toEqual(['Second', 'First', 'Third']);
        await waitFor(() => expect(writes).toEqual([{ method: 'PATCH', path: '/me/plan/a1', body: { position: 2.5 } }]));
    });

    it('moves up before the row whose top half it is dropped on', async () => {
        await renderDay();
        await start('c3');
        await drop('c3', overRow('a1'), 10);
        expect(planTitles()).toEqual(['Third', 'First', 'Second']);
        await waitFor(() => expect(writes).toEqual([{ method: 'PATCH', path: '/me/plan/c3', body: { position: 0 } }]));
    });

    it('sends nothing when dropped where it already is', async () => {
        await renderDay();
        await start('b2');
        await drop('b2', overRow('b2'), 70);  // its own top half
        await start('b2');
        await drop('b2', overRow('b2'), 110); // its own bottom half
        await start('b2');
        await drop('b2', overRow('a1'), 50);  // the bottom half of the row above: still second
        await start('b2');
        await drop('b2', overRow('c3'), 130); // the top half of the row below: still second

        expect(planTitles()).toEqual(['First', 'Second', 'Third']);
        expect(writes).toEqual([]);
    });
});

describe('Today: what a drag shows', () => {
    it('fades the dragged plan row, leaves the rows where they are, and draws the accent line where it would land', async () => {
        await renderDay();
        await start('a1');
        expect(row('First').style.opacity).toBe('0.35');
        expect(row('Second').style.opacity).not.toBe('0.35');

        await move('a1', overRow('c3'), 130); // top half of the third row
        expect(row('Third').style.boxShadow).toBe('inset 0 3px 0 var(--accent)');
        expect(row('Second').style.boxShadow).not.toContain('var(--accent)');
        expect(planRows().map((r) => r.style.transform)).toEqual(['', '', '']);

        await move('a1', overRow('c3'), 170); // bottom half of the last row: the line goes under it
        expect(row('Third').style.boxShadow).toBe('inset 0 -3px 0 var(--accent)');

        await drop('a1', null, 900);
        expect(row('First').style.opacity).not.toBe('0.35');
        expect(row('Third').style.boxShadow).not.toContain('var(--accent)');
    });

    it('draws the line over the focus card in place of its shadow, and gives the shadow back', async () => {
        await renderDay();
        expect(row('First').style.boxShadow).toBe('6px 6px 0 var(--fg)');
        await start('suggestion:s1');
        await move('suggestion:s1', overRow('a1'), 10);
        expect(row('First').style.boxShadow).toBe('inset 0 3px 0 var(--accent)');
        await act(() => handlers().onDragCancel({ active: { id: 'suggestion:s1' } } as never));
        expect(row('First').style.boxShadow).toBe('6px 6px 0 var(--fg)');
    });

    it('fades the dragged suggestion', async () => {
        await renderDay();
        const first = screen.getAllByTestId('suggestion-row')[0];
        await start('suggestion:s1');
        expect(first.style.opacity).toBe('0.35');
        expect(screen.getAllByTestId('suggestion-row')[1].style.opacity).not.toBe('0.35');
    });

    it('dashes the suggestions box while a plan item is over it, and not for a suggestion', async () => {
        await renderDay();
        const box = screen.getByTestId('suggestions-zone');
        expect(box.style.borderStyle).toBe('solid');

        await start('b2');
        await move('b2', SUGG_ZONE, 600);
        expect(box.style.borderStyle).toBe('dashed');
        expect(box.style.borderColor).toBe('var(--fg)');
        expect(box.style.borderWidth).toBe('2px');
        await move('b2', overRow('a1'), 10);
        expect(box.style.borderStyle).toBe('solid');
        await drop('b2', null, 900);

        await start('suggestion:s1');
        await move('suggestion:s1', SUGG_ZONE, 600);
        expect(box.style.borderStyle).toBe('solid');
    });

    it('carries a copy of the dragged item under the pointer', async () => {
        await renderDay();
        expect(screen.queryByTestId('plan-drag-ghost')).toBeNull();
        await start('suggestion:s2');
        expect(screen.getByTestId('plan-drag-ghost')).toHaveTextContent('Could fit two');
        await drop('suggestion:s2', null, 900);
        await start('b2');
        expect(screen.getByTestId('plan-drag-ghost')).toHaveTextContent('Second');
    });
});
