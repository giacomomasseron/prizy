import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { IssuesHeader } from './IssuesHeader';

// Hoist a shared navigate spy so the vi.mock factory can close over it.
// vi.mock is hoisted before imports by Vitest, but the factory is called
// lazily (when the module is first resolved), by which time the variable
// is already initialised — the closure captures the binding, not the value.
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return { ...actual, useNavigate: () => mockNavigate };
});

function wrap(ui: React.ReactNode, path = '/') {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/" element={<>{ui}</>} />
                <Route path="/board" element={<>{ui}</>} />
            </Routes>
        </MemoryRouter>
    );
}

describe('IssuesHeader', () => {
    beforeEach(() => {
        mockNavigate.mockReset();
    });

    it('renders "Issues" title', () => {
        wrap(<IssuesHeader view="list" />);
        expect(screen.getByText('Issues')).toBeInTheDocument();
    });

    it('renders List and Board buttons via SegmentedControl', () => {
        wrap(<IssuesHeader view="list" />);
        expect(screen.getByRole('button', { name: 'List' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Board' })).toBeInTheDocument();
    });

    it('renders search button with ⌘K hint', () => {
        wrap(<IssuesHeader view="list" />);
        expect(screen.getByText('Search')).toBeInTheDocument();
        expect(screen.getByText('⌘K')).toBeInTheDocument();
    });

    it('dispatches ⌘K keydown when search button is clicked', () => {
        wrap(<IssuesHeader view="list" />);
        const spy = vi.fn();
        window.addEventListener('keydown', spy);
        const btn = screen.getByText('Search').closest('button')!;
        fireEvent.click(btn);
        expect(spy).toHaveBeenCalledWith(expect.objectContaining({ key: 'k', metaKey: true }));
        window.removeEventListener('keydown', spy);
    });

    // NEW 1 — active-segment discrimination
    // SegmentedControl uses inline style background:'var(--panel)' for the
    // active button and 'transparent' for inactive. The test must fail if
    // the wrong segment were highlighted.
    it('marks the correct SegmentedControl button as active via inline background style', () => {
        // List view: List gets var(--panel), Board gets transparent
        const { unmount } = wrap(<IssuesHeader view="list" />);
        expect(screen.getByRole('button', { name: 'List' }).style.background).toBe('var(--panel)');
        expect(screen.getByRole('button', { name: 'Board' }).style.background).toBe('transparent');
        unmount();

        // Board view: Board gets var(--panel), List gets transparent
        wrap(<IssuesHeader view="board" />);
        expect(screen.getByRole('button', { name: 'Board' }).style.background).toBe('var(--panel)');
        expect(screen.getByRole('button', { name: 'List' }).style.background).toBe('transparent');
    });

    // NEW 2 — navigation on segment click
    // SegmentedControl fires onChange → handleNav → navigate(path, {replace:true}).
    it('calls navigate with the correct path when a segment is clicked', () => {
        wrap(<IssuesHeader view="list" />);

        fireEvent.click(screen.getByRole('button', { name: 'Board' }));
        expect(mockNavigate).toHaveBeenCalledWith('/board', { replace: true });

        mockNavigate.mockClear();

        fireEvent.click(screen.getByRole('button', { name: 'List' }));
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
});
