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
});
