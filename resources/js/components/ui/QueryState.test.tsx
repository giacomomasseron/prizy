import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryState } from './QueryState';

const q = (over: Partial<{ isLoading: boolean; isError: boolean; data: unknown; refetch: () => unknown; isPaused: boolean; isFetching: boolean }>) =>
    ({ isLoading: false, isError: false, data: undefined, refetch: vi.fn(), ...over });

describe('QueryState (V2-G3c)', () => {
    it('says it is loading, as a status, while the query loads', () => {
        render(<QueryState query={q({ isLoading: true })} what="teams"><p>content</p></QueryState>);
        expect(screen.getByRole('status')).toHaveTextContent('Loading…');
        expect(screen.queryByText('content')).toBeNull();
    });
    it('says the load failed, as an alert, and Retry refetches', () => {
        const query = q({ isError: true });
        render(<QueryState query={query} what="teams"><p>content</p></QueryState>);
        expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load teams.");
        fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
        expect(query.refetch).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('content')).toBeNull();
    });
    it('shows the content once loaded — including its own empty state', () => {
        render(<QueryState query={q({ data: [] })} what="teams"><p>No teams yet.</p></QueryState>);
        expect(screen.getByText('No teams yet.')).toBeInTheDocument();
        expect(screen.queryByRole('alert')).toBeNull();
    });
    it('keeps data already on screen when a refetch fails', () => {
        render(<QueryState query={q({ isError: true, data: [{ id: 1 }] })} what="teams"><p>content</p></QueryState>);
        expect(screen.getByText('content')).toBeInTheDocument();
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('wraps the loading line and the error card in the frame a page passes', () => {
        const { rerender } = render(<QueryState query={q({ isLoading: true })} what="teams" frame={{ padding: '20px 18px' }}><p>content</p></QueryState>);
        expect((screen.getByRole('status').parentElement as HTMLElement).style.padding).toBe('20px 18px');
        rerender(<QueryState query={q({ isError: true })} what="teams" frame={{ padding: '20px 18px' }}><p>content</p></QueryState>);
        expect((screen.getByRole('alert').parentElement as HTMLElement).style.padding).toBe('20px 18px');
    });

    it('G3c: a paused (offline) query with no data says it is waiting for the network, not empty', () => {
        render(<QueryState query={q({ isPaused: true })} what="teams"><p>No teams yet.</p></QueryState>);
        expect(screen.getByRole('status')).toHaveTextContent('Waiting for the network…');
        expect(screen.queryByText('No teams yet.')).toBeNull();
    });
    it('G3c: a paused query that already has data keeps showing it', () => {
        render(<QueryState query={q({ isPaused: true, data: [{ id: 1 }] })} what="teams"><p>content</p></QueryState>);
        expect(screen.getByText('content')).toBeInTheDocument();
        expect(screen.queryByRole('status')).toBeNull();
    });
    it('G3c: Retry is disabled while the refetch is in flight', () => {
        render(<QueryState query={q({ isError: true, isFetching: true })} what="teams"><p>content</p></QueryState>);
        expect(screen.getByRole('button', { name: 'Retry' })).toBeDisabled();
    });
});
