import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SupportIconRail } from './SupportIconRail';

vi.mock('../../auth/useAuth', () => ({
    useMe: () => ({ data: { id: 'u1', name: 'Me' } }),
}));

describe('SupportIconRail', () => {
    it('invokes onNewTicket when the New ticket button is clicked', () => {
        const onNewTicket = vi.fn();
        render(
            <MemoryRouter>
                <SupportIconRail viewsOpen onToggleViews={vi.fn()} onNewTicket={onNewTicket} />
            </MemoryRouter>,
        );
        fireEvent.click(screen.getByRole('button', { name: 'New ticket' }));
        expect(onNewTicket).toHaveBeenCalledTimes(1);
    });

    it('links to the reporting screen', () => {
        render(
            <MemoryRouter>
                <SupportIconRail viewsOpen onToggleViews={vi.fn()} onNewTicket={vi.fn()} />
            </MemoryRouter>,
        );
        expect(screen.getByRole('link', { name: 'Reporting' })).toHaveAttribute('href', '/support/reporting');
    });

    it('links to the knowledge base', () => {
        render(<MemoryRouter><SupportIconRail viewsOpen onToggleViews={vi.fn()} onNewTicket={vi.fn()} /></MemoryRouter>);
        expect(screen.getByRole('link', { name: 'Knowledge base' })).toHaveAttribute('href', '/support/kb');
    });

    it('v2: Home is the active item; Views is active only while the sidebar is open; names unchanged', () => {
        const { rerender } = render(<MemoryRouter><SupportIconRail viewsOpen onToggleViews={vi.fn()} onNewTicket={vi.fn()} /></MemoryRouter>);
        expect(screen.getByTitle('Home').className).toContain('bg-sup2');
        expect(screen.getByRole('button', { name: 'Views' }).className).toContain('bg-sup2');
        expect(screen.getByRole('button', { name: 'Views' })).toHaveAttribute('aria-pressed', 'true');
        rerender(<MemoryRouter><SupportIconRail viewsOpen={false} onToggleViews={vi.fn()} onNewTicket={vi.fn()} /></MemoryRouter>);
        const views = screen.getByRole('button', { name: 'Views' });
        expect(views.className).toContain('hover:bg-hover');
        expect(views.style.background).toBe('');
        expect(screen.getByRole('link', { name: 'Prizy' })).toHaveAttribute('href', '/support');
        expect(screen.getByRole('link', { name: 'Reporting' }).className).toContain('hover:bg-hover');
    });

    it('G3b: Home is a link to the desk, marked as the current page', () => {
        render(<MemoryRouter><SupportIconRail viewsOpen={false} onToggleViews={vi.fn()} onNewTicket={vi.fn()} /></MemoryRouter>);
        const home = screen.getByRole('link', { name: 'Home' });
        expect(home).toHaveAttribute('href', '/support');
        expect(home).toHaveAttribute('aria-current', 'page');
    });
});
