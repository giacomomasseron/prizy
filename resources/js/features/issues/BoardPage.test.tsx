import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { IssueStatus } from '../../lib/types';

// Mock hooks so we don't need a running server
vi.mock('./hooks', async (orig) => {
    const real = await orig<typeof import('./hooks')>();
    return {
        ...real,
        useIssues: () => ({
            data: {
                items: [
                    {
                        id: 'c1', title: 'Card one', status: 'todo', priority: 'medium',
                        description: null, estimate: null, due_date: null, sort_order: 0,
                        team_id: 't1', project_id: null, cycle_id: null, parent_issue_id: null,
                        assignee_id: null, created_by: 'u1', archived_at: null, labels: [],
                        identifier: 'PRZ-1',
                        created_at: '2026-07-04T00:00:00.000000Z',
                        updated_at: '2026-07-04T00:00:00.000000Z',
                    },
                ],
                next: null,
            },
            isLoading: false,
        }),
        useTransitionStatus: () => ({ mutate: vi.fn() }),
    };
});
vi.mock('../projects/hooks', () => ({ useProjects: () => ({ data: { items: [] } }) }));
vi.mock('../views/filters', async (orig) => {
    const real = await orig<typeof import('../views/filters')>();
    return { ...real, paramsToFilters: () => ({}) };
});
// Stub useIssueDrawers — openPeek captured so tests can assert it was called
const mockOpenPeek = vi.fn();
vi.mock('./useIssueDrawers', () => ({
    useIssueDrawers: () => ({
        peekId: null, createOpen: false, createStatus: null,
        openPeek: mockOpenPeek, openCreate: vi.fn(), close: vi.fn(),
    }),
}));

import BoardPage from './BoardPage';

// Spy component: renders alongside BoardPage and mirrors the current search params
// so tests can assert URL state after interactions (same pattern as FilterBar.test.tsx).
function BoardHarness() {
    const [sp] = useSearchParams();
    return (
        <>
            <BoardPage />
            <output data-testid="qs">{sp.toString()}</output>
        </>
    );
}

function mountBoard() {
    const qc = new QueryClient();
    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter initialEntries={['/board']}>
                <BoardPage />
            </MemoryRouter>
        </QueryClientProvider>
    );
}

function mountBoardWithSpy(initial = '/board') {
    const qc = new QueryClient();
    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter initialEntries={[initial]}>
                <BoardHarness />
            </MemoryRouter>
        </QueryClientProvider>
    );
}

describe('BoardPage', () => {
    it('renders exactly 5 columns (no Cancelled)', () => {
        mountBoard();
        const cols = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];
        for (const s of cols) {
            expect(screen.getByTestId(`col-${s}`)).toBeInTheDocument();
        }
        expect(screen.queryByTestId('col-cancelled')).not.toBeInTheDocument();
    });

    it('renders card with data-testid card-{id}', () => {
        mountBoard();
        expect(screen.getByTestId('card-c1')).toBeInTheDocument();
    });

    it('card shows identifier', () => {
        mountBoard();
        expect(screen.getByText('PRZ-1')).toBeInTheDocument();
    });

    it('card shows title', () => {
        mountBoard();
        expect(screen.getByText('Card one')).toBeInTheDocument();
    });

    it('plain click on a card calls openPeek with the issue id', () => {
        mockOpenPeek.mockClear();
        mountBoard();
        fireEvent.click(screen.getByTestId('card-c1'));
        expect(mockOpenPeek).toHaveBeenCalledWith('c1');
    });

    // drag→no-peek is covered by the Playwright board spec in Task 8.
    // The guard lives in guardedCardClick() in BoardPage: onDragEnd sets
    // justDragged.current = true; the next call to guardedCardClick() returns
    // early and resets the flag. Full @dnd-kit pointer-drag simulation in jsdom
    // is unreliable, so the drag branch is not exercised here.
});
