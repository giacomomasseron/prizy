import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { DndContextProps } from '@dnd-kit/core';
import type { Todo } from '../../lib/types';
import { TodoCard } from './TodoCard';

// Today (the 2026-11 design): dragging a to-do. Nothing shifts; the row fades and an ink line shows where it lands.
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

function todo(id: string, text: string, position: number, extra: Partial<Todo> = {}): Todo {
    return { id, text, done: false, completed_at: null, position, issue: null, created_at: '2026-10-10T08:00:00Z', ...extra };
}
function j(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

let server: Todo[];
let writes: Array<{ method: string; path: string; body: Record<string, unknown> }>;

beforeEach(() => {
    writes = [];
    server = [todo('t1', 'A', 1), todo('t2', 'B', 2), todo('t3', 'C', 3), todo('t4', 'Old', 4, { done: true, completed_at: '2026-10-10T07:00:00Z' })];
    let loaded = false;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url);
        const method = init?.method ?? 'GET';
        if (!u.includes('/me/todos')) return j({ data: [] });
        if (method !== 'GET') {
            writes.push({ method, path: u.replace(/^.*\/v1/, ''), body: init?.body ? JSON.parse(String(init.body)) : {} });
            return new Promise<Response>(() => {}); // never answers: what shows is the optimistic update
        }
        if (loaded) return new Promise<Response>(() => {});
        loaded = true;
        return j({ data: server });
    }));
});
afterEach(() => vi.unstubAllGlobals());

async function renderCard() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={qc}><MemoryRouter><TodoCard starters={[]} /></MemoryRouter></QueryClientProvider>);
    await screen.findByText('A');
}

type Handlers = Required<Pick<DndContextProps, 'onDragStart' | 'onDragMove' | 'onDragEnd' | 'onDragCancel'>>;
const handlers = () => dnd.props as Handlers;
/** An open to-do as a drop target: 40px tall, by its place in the list. */
const overRow = (id: string) => {
    const index = ['t1', 't2', 't3'].indexOf(id);
    return { id, rect: { top: index * 40, left: 0, width: 300, height: 40, bottom: index * 40 + 40, right: 300 } };
};
const ZONE = { id: 'zone:todos', rect: { top: 0, left: 0, width: 300, height: 200, bottom: 200, right: 300 } };
const pointer = (activeId: string, over: unknown, y: number) => ({ active: { id: activeId }, over, activatorEvent: { clientY: 0 }, delta: { x: 0, y } }) as never;
const start = (id: string) => act(() => handlers().onDragStart({ active: { id } } as never));
const move = (id: string, over: unknown, y: number) => act(() => handlers().onDragMove(pointer(id, over, y)));
const drop = (id: string, over: unknown, y: number) => act(() => handlers().onDragEnd(pointer(id, over, y)));
const rows = () => within(screen.getByRole('list', { name: 'Open to-dos' })).getAllByTestId('todo-row');
const texts = () => rows().map((r) => r.querySelector('[id^="todo-"]')?.textContent);

describe('Today: dragging a to-do', () => {
    it('makes the whole row the handle, and leaves no row shifted or tinted', async () => {
        await renderCard();
        for (const r of rows()) {
            expect(r.style.cursor).toBe('grab');
            expect(r.style.transform).toBe('');
            expect(r.style.background).toBe('');
        }
    });

    it('fades the dragged row and draws the note\'s ink line where it would land', async () => {
        await renderCard();
        await start('t1');
        expect(rows()[0].style.opacity).toBe('0.35');
        expect(rows()[1].style.opacity).not.toBe('0.35');
        expect(screen.getByTestId('todo-drag-ghost')).toHaveTextContent('A');

        await move('t1', overRow('t3'), 90); // the top half of the third row (80–120)
        expect(rows()[2].style.boxShadow).toBe('inset 0 3px 0 var(--on-hi)');
        expect(rows()[1].style.boxShadow).toBe('');
        expect(rows().map((r) => r.style.transform)).toEqual(['', '', '']);

        await move('t1', overRow('t3'), 110); // its bottom half: the line goes under the last row
        expect(rows()[2].style.boxShadow).toBe('inset 0 -3px 0 var(--on-hi)');

        await act(() => handlers().onDragCancel({ active: { id: 't1' } } as never));
        expect(rows()[0].style.opacity).not.toBe('0.35');
        expect(rows()[2].style.boxShadow).toBe('');
        expect(screen.queryByTestId('todo-drag-ghost')).toBeNull();
    });

    it('moves a to-do before the row whose top half it is dropped on', async () => {
        await renderCard();
        await start('t3');
        await drop('t3', overRow('t1'), 10);
        await waitFor(() => expect(texts()).toEqual(['C', 'A', 'B']));
        expect(writes).toEqual([{ method: 'PATCH', path: '/me/todos/t3', body: { position: 0 } }]);
    });

    it('moves a to-do after the row whose bottom half it is dropped on', async () => {
        await renderCard();
        await start('t1');
        await drop('t1', overRow('t2'), 70);
        await waitFor(() => expect(texts()).toEqual(['B', 'A', 'C']));
        expect(writes).toEqual([{ method: 'PATCH', path: '/me/todos/t1', body: { position: 2.5 } }]);
    });

    it('puts a to-do last when it is dropped under the rows', async () => {
        await renderCard();
        await start('t1');
        await drop('t1', ZONE, 180);
        await waitFor(() => expect(texts()).toEqual(['B', 'C', 'A']));
        expect(writes).toEqual([{ method: 'PATCH', path: '/me/todos/t1', body: { position: 4 } }]);
    });

    it('sends nothing when a to-do is dropped where it already is, or nowhere', async () => {
        await renderCard();
        await start('t2');
        await drop('t2', overRow('t2'), 50);
        await start('t2');
        await drop('t2', overRow('t1'), 30); // the bottom half of the row above
        await start('t2');
        await drop('t2', overRow('t3'), 90); // the top half of the row below
        await start('t2');
        await drop('t2', null, 900);
        expect(texts()).toEqual(['A', 'B', 'C']);
        expect(writes).toEqual([]);
    });
});
