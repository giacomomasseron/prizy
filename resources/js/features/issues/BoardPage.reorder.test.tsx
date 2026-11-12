import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { Collision, DndContextProps } from '@dnd-kit/core';
import type { Issue, IssueStatus } from '../../lib/types';

// The board's drag handlers are driven directly: a real pointer drag through dnd-kit is unreliable in jsdom.
const dnd = vi.hoisted(() => ({ props: null as unknown }));
vi.mock('@dnd-kit/core', async (orig) => {
    const real = await orig<typeof import('@dnd-kit/core')>();
    return {
        ...real,
        DndContext: (props: DndContextProps) => { dnd.props = props; return createElement(real.DndContext, props); },
    };
});

function issue(id: string, status: IssueStatus, extra: Partial<Issue> = {}): Issue {
    return {
        id, title: `Card ${id}`, status, priority: 'medium', description: null, estimate: null, due_date: null, sort_order: 0,
        team_id: 't1', project_id: null, cycle_id: null, parent_issue_id: null, assignee_id: null, created_by: 'u1',
        archived_at: null, labels: [], identifier: `PRZ-${id}`,
        created_at: '2026-07-04T00:00:00.000000Z', updated_at: '2026-07-04T00:00:00.000000Z', ...extra,
    } as Issue;
}

const state = vi.hoisted(() => ({ items: [] as unknown[] }));
const mockMove = vi.fn();
const mockOpenPeek = vi.fn();
vi.mock('./hooks', async (orig) => {
    const real = await orig<typeof import('./hooks')>();
    return {
        ...real,
        useIssues: () => ({ data: { items: state.items, next: null }, isLoading: false }),
        useMoveIssue: () => ({ mutate: mockMove }),
    };
});
vi.mock('../projects/hooks', () => ({ useProjects: () => ({ data: { items: [] } }) }));
vi.mock('./useIssueDrawers', () => ({
    useIssueDrawers: () => ({ peekId: null, createOpen: false, createStatus: null, openPeek: mockOpenPeek, openCreate: vi.fn(), close: vi.fn() }),
}));

import BoardPage, { cardsFirst } from './BoardPage';

function Harness() {
    const [sp] = useSearchParams();
    return (<><BoardPage /><output data-testid="qs">{sp.toString()}</output></>);
}
function mount(initial = '/board') {
    return render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter initialEntries={[initial]}><Harness /></MemoryRouter>
        </QueryClientProvider>,
    );
}

type Target = { status: IssueStatus; before: string | null };
const overCard = (status: IssueStatus, id: string) => ({ id: `card:${id}`, data: { current: { status, before: id } satisfies Target } });
const overColumn = (status: IssueStatus) => ({ id: status, data: { current: { status, before: null } satisfies Target } });
const handlers = () => dnd.props as Required<Pick<DndContextProps, 'onDragStart' | 'onDragOver' | 'onDragEnd' | 'onDragCancel'>>;
const start = (id: string) => act(() => handlers().onDragStart({ active: { id } } as never));
const over = (id: string, target: unknown) => act(() => handlers().onDragOver({ active: { id }, over: target } as never));
const drop = (id: string, target: unknown) => act(() => handlers().onDragEnd({ active: { id }, over: target } as never));
const slot = (id: string) => screen.getByTestId(`slot-${id}`);
const cardsIn = (status: IssueStatus) => within(screen.getByTestId(`col-${status}`)).getAllByTestId(/^card-/).map((c) => c.getAttribute('data-testid'));

beforeEach(() => {
    mockMove.mockClear();
    mockOpenPeek.mockClear();
    state.items = [issue('a', 'todo'), issue('b', 'todo'), issue('c', 'todo'), issue('p', 'in_progress'), issue('q', 'in_progress')];
});

describe('BoardPage: dragging a card', () => {
    it('fades the dragged card to 35% where it is, and only that card', () => {
        mount();
        expect(slot('c').style.opacity).toBe('1');
        start('c');
        expect(slot('c').style.opacity).toBe('0.35');
        expect(slot('b').style.opacity).toBe('1');
    });

    it('draws the accent line above the card it would land before', () => {
        mount();
        expect(slot('b').style.borderTop).toBe('3px solid transparent');
        start('c');
        over('c', overCard('todo', 'b'));
        expect(slot('b').style.borderTop).toBe('3px solid var(--accent)');
        expect(slot('a').style.borderTop).toBe('3px solid transparent');
        // The line takes no room of its own: the slot is pulled up by what its border and padding add.
        expect(slot('b').style.marginTop).toBe('-5px');
        expect(slot('b').style.paddingTop).toBe('2px');
    });

    it('draws no line above the dragged card itself', () => {
        mount();
        start('c');
        over('c', overCard('todo', 'c'));
        expect(slot('c').style.borderTop).toBe('3px solid transparent');
    });

    it('marks the column under the pointer with the hover fill and a dashed outline, over a card or beside one', () => {
        mount();
        const col = (s: IssueStatus) => screen.getByTestId(`col-${s}`);
        expect(col('in_progress').style.background).toBe('transparent');
        expect(col('in_progress').style.outline).toBe('1.5px dashed transparent');
        start('c');
        over('c', overColumn('in_progress'));
        expect(col('in_progress').style.background).toBe('var(--hover)');
        expect(col('in_progress').style.outline).toBe('1.5px dashed var(--border2)');
        expect(col('todo').style.background).toBe('transparent');
        over('c', overCard('todo', 'a'));
        expect(col('todo').style.background).toBe('var(--hover)');
        expect(col('in_progress').style.background).toBe('transparent');
    });

    it('clears every mark when the pointer leaves the board, and when the drag ends or is cancelled', () => {
        mount();
        start('c');
        over('c', overCard('todo', 'a'));
        over('c', null);
        expect(slot('a').style.borderTop).toBe('3px solid transparent');
        expect(screen.getByTestId('col-todo').style.background).toBe('transparent');
        expect(slot('c').style.opacity).toBe('0.35');

        over('c', overCard('todo', 'a'));
        act(() => handlers().onDragCancel({} as never));
        expect(slot('c').style.opacity).toBe('1');
        expect(slot('a').style.borderTop).toBe('3px solid transparent');
        expect(mockMove).not.toHaveBeenCalled();

        start('c');
        over('c', overCard('todo', 'a'));
        drop('c', overCard('todo', 'a'));
        expect(slot('c').style.opacity).toBe('1');
        expect(slot('a').style.borderTop).toBe('3px solid transparent');
        expect(screen.getByTestId('col-todo').style.background).toBe('transparent');
    });
});

describe('BoardPage: dropping a card', () => {
    it('moves it before the card it was dropped on, in its own column, without a status', () => {
        mount();
        start('c');
        drop('c', overCard('todo', 'a'));
        expect(mockMove).toHaveBeenCalledExactlyOnceWith({ id: 'c', status: undefined, beforeId: 'a' });
    });

    it('moves it into another column before the card it was dropped on', () => {
        mount();
        start('a');
        drop('a', overCard('in_progress', 'q'));
        expect(mockMove).toHaveBeenCalledExactlyOnceWith({ id: 'a', status: 'in_progress', beforeId: 'q' });
    });

    it('moves it to the end of another column when dropped on the column', () => {
        mount();
        start('a');
        drop('a', overColumn('done'));
        expect(mockMove).toHaveBeenCalledExactlyOnceWith({ id: 'a', status: 'done', beforeId: null });
    });

    it('moves it to the end of its own column when dropped beside the cards', () => {
        mount();
        start('a');
        drop('a', overColumn('todo'));
        expect(mockMove).toHaveBeenCalledExactlyOnceWith({ id: 'a', status: undefined, beforeId: null });
    });

    it('saves nothing when it is dropped where it already is', () => {
        mount();
        start('a'); drop('a', overCard('todo', 'a')); // on itself
        start('a'); drop('a', overCard('todo', 'b')); // before the card that already follows it
        start('c'); drop('c', overColumn('todo')); // at the end, where it is
        start('a'); drop('a', null); // outside the board
        expect(mockMove).not.toHaveBeenCalled();
    });

    it('does not open the card with the click that ends a drop, but opens it on the next click', () => {
        mount();
        start('c');
        drop('c', overCard('todo', 'a'));
        fireEvent.click(screen.getByTestId('card-c'));
        expect(mockOpenPeek).not.toHaveBeenCalled();
        fireEvent.click(screen.getByTestId('card-c'));
        expect(mockOpenPeek).toHaveBeenCalledWith('c');
    });

    it('goes back to the manual order when a card is dropped before another while the board is sorted', () => {
        mount('/board?sort=priority&priority=high');
        start('c');
        drop('c', overCard('todo', 'a'));
        expect(screen.getByTestId('qs').textContent).toBe('priority=high');
    });

    it('keeps the sort for a drop on a column, which only changes the status', () => {
        mount('/board?sort=priority');
        start('a');
        drop('a', overColumn('done'));
        expect(screen.getByTestId('qs').textContent).toBe('sort=priority');
    });
});

describe('BoardPage: the order of a column', () => {
    it('shows the cards in the order the list came in', () => {
        mount();
        expect(cardsIn('todo')).toEqual(['card-a', 'card-b', 'card-c']);
    });

    it('puts starred cards first, the newest star on top', () => {
        state.items = [
            issue('a', 'todo'),
            issue('b', 'todo', { starred: true, starred_at: '2026-11-01T10:00:00Z' }),
            issue('c', 'todo'),
            issue('d', 'todo', { starred: true, starred_at: '2026-11-02T10:00:00Z' }),
        ];
        mount();
        expect(cardsIn('todo')).toEqual(['card-d', 'card-b', 'card-a', 'card-c']);
    });
});

describe('BoardPage: card layout', () => {
    it('places the star at the right end of the top row, after the priority icon', () => {
        mount();
        const star = within(slot('a')).getByRole('button', { name: 'Star' });
        expect(star.style.position).toBe('absolute');
        expect(star.style.right).toBe('15px');
        expect(star.style.top).toBe('12px');
        const top = screen.getByTestId('card-a').firstElementChild as HTMLElement;
        // The priority icon leaves the star's 24px and the row's 6px gap free on its right.
        expect((top.lastElementChild as HTMLElement).style.marginRight).toBe('28px');
    });
});

describe('cardsFirst', () => {
    const hit = (id: string, before: string | null): Collision => ({ id, data: { droppableContainer: { data: { current: { status: 'todo', before } } } } }) as never;

    it('prefers the card under the pointer over the column that holds it', () => {
        expect(cardsFirst([hit('todo', null), hit('card:b', 'b')]).map((c) => c.id)).toEqual(['card:b']);
    });
    it('keeps the column when the pointer is beside the cards', () => {
        expect(cardsFirst([hit('todo', null)]).map((c) => c.id)).toEqual(['todo']);
    });
    it('is empty when the pointer is over nothing', () => {
        expect(cardsFirst([])).toEqual([]);
    });
});
