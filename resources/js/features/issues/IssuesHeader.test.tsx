import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { IssuesHeader } from './IssuesHeader';
import { setFontScale } from '../../lib/fontScale';

// Hoist a shared navigate spy so the vi.mock factory can close over it.
// vi.mock is hoisted before imports by Vitest, but the factory is called
// lazily (when the module is first resolved), by which time the variable
// is already initialised — the closure captures the binding, not the value.
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return { ...actual, useNavigate: () => mockNavigate };
});

// The header no longer shows the account menu (Workspace mockup, 2026-11-11: the avatar lives in the sidebar
// footer only). The stub stays so a test can prove the header does not render it.
vi.mock('../../components/UserMenu', () => ({
    UserMenu: () => <div data-testid="user-menu-stub" />,
}));
// NotificationBell pulls in react-query notification hooks; stub it here — its
// behaviour is covered by NotificationBell.test.tsx.
vi.mock('../notifications/NotificationBell', () => ({
    NotificationBell: () => <div data-testid="notif-bell-stub" />,
}));

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
        setFontScale(1);       // reset the font-scale singleton between tests
        localStorage.clear();
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

    it('the search pill shows only the glass and the ⌘K hint, and is still named for readers', () => {
        wrap(<IssuesHeader view="list" />);
        const search = screen.getByRole('button', { name: 'Search ⌘K' });
        expect(search.textContent).toBe('⌕⌘K');
        expect(screen.queryByText('Search')).toBeNull();
    });

    it('dispatches ⌘K keydown when search button is clicked', () => {
        wrap(<IssuesHeader view="list" />);
        const spy = vi.fn();
        window.addEventListener('keydown', spy);
        fireEvent.click(screen.getByRole('button', { name: 'Search ⌘K' }));
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
        expect(mockNavigate).toHaveBeenCalledWith('/issues', { replace: true });
    });

    // ── Text-size control (A−/⟲/A+) ──
    it('renders the A−/⟲/A+ text-size buttons', () => {
        wrap(<IssuesHeader view="list" />);
        expect(screen.getByRole('button', { name: 'Decrease text size' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Reset text size' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Increase text size' })).toBeInTheDocument();
    });

    it('at 100% the reset button is disabled; increase/decrease are enabled', () => {
        wrap(<IssuesHeader view="list" />);
        expect(screen.getByRole('button', { name: 'Reset text size' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Increase text size' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Decrease text size' })).toBeEnabled();
    });

    it('clicking Increase enables the reset button (scale moved off 100%)', () => {
        wrap(<IssuesHeader view="list" />);
        fireEvent.click(screen.getByRole('button', { name: 'Increase text size' }));
        expect(screen.getByRole('button', { name: 'Reset text size' })).toBeEnabled();
    });

    it('Reset returns to 100% and disables itself again', () => {
        wrap(<IssuesHeader view="list" />);
        fireEvent.click(screen.getByRole('button', { name: 'Increase text size' }));
        const resetBtn = screen.getByRole('button', { name: 'Reset text size' });
        expect(resetBtn).toBeEnabled();
        fireEvent.click(resetBtn);
        expect(resetBtn).toBeDisabled();
    });

    // ── Notifications bell + theme toggle (right side of the toolbar) ──
    it('renders the notifications bell and the Toggle theme button, and no account menu', () => {
        wrap(<IssuesHeader view="list" />);
        expect(screen.getByTestId('notif-bell-stub')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Toggle theme' })).toBeInTheDocument();
        expect(screen.queryByTestId('user-menu-stub')).toBeNull();
    });

    it('the theme toggle is the last control of the header', () => {
        const { container } = wrap(<IssuesHeader view="list" />);
        const actions = container.querySelector('header')!.lastElementChild as HTMLElement;
        expect(actions.lastElementChild).toBe(screen.getByRole('button', { name: 'Toggle theme' }));
    });

    // ── v2 header ──
    it('renders the v2 page header: an h1 "Issues"', () => {
        wrap(<IssuesHeader view="list" />);
        expect(screen.getByRole('heading', { level: 1, name: 'Issues' })).toBeInTheDocument();
    });

    it('search, theme and text-size controls hover via classes (no inline colours)', () => {
        wrap(<IssuesHeader view="list" />);
        const search = screen.getByRole('button', { name: 'Search ⌘K' });
        expect(search.style.borderColor).toBe('');
        expect(search.className).toContain('hover:border-fg');
        const theme = screen.getByRole('button', { name: 'Toggle theme' });
        expect(theme.style.borderColor).toBe('');
        expect(theme.style.borderRadius).toBe('50%');
        expect(theme.className).toContain('hover:border-border2');
        const inc = screen.getByRole('button', { name: 'Increase text size' });
        expect(inc.style.background).toBe('');
        expect(inc.className).toContain('enabled:hover:bg-hover');
    });
});

describe('IssuesHeader: the "From Support" chip', () => {
    function Where() {
        const l = useLocation();
        return <output data-testid="where">{l.pathname + l.search}</output>;
    }
    const at = (path: string) => wrap(<><IssuesHeader view="list" /><Where /></>, path);

    beforeEach(() => mockNavigate.mockReset());

    it('is not there on the plain issue list', () => {
        at('/?status=todo');
        expect(screen.queryByText('From Support')).toBeNull();
    });

    it('sits right after the title when the list is scoped to escalated issues, in accent ink on the accent tint', () => {
        at('/?escalated=true');
        const chip = screen.getByText('From Support');
        expect(chip.style.background).toBe('var(--accent2)');
        expect(chip.style.color).toBe('var(--accent-ink)');
        expect(chip.style.fontWeight).toBe('700');
        expect(chip.previousElementSibling?.tagName).toBe('H1');
        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Issues');
    });

    it('its ✕ leaves the scope and keeps the other filters', () => {
        at('/?escalated=true&status=todo');
        fireEvent.click(screen.getByRole('button', { name: 'Clear From Support filter' }));
        expect(screen.getByTestId('where').textContent).toBe('/?status=todo');
        expect(screen.queryByText('From Support')).toBeNull();
    });

    it('the List / Board switch stays inside the scope', () => {
        at('/?escalated=true&status=todo');
        fireEvent.click(screen.getByRole('button', { name: 'Board' }));
        expect(mockNavigate).toHaveBeenCalledWith('/board?escalated=true', { replace: true });
    });
});
