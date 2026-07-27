import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SupportViewsSidebar } from './SupportViewsSidebar';
import type { TicketCounts } from '../../lib/types';

const counts: TicketCounts = {
    by_status: { new: 1, open: 2, pending: 3, on_hold: 0, solved: 4, closed: 1 },
    by_channel: { email: 5, chat: 2, portal: 0, api: 1 },
    unassigned: 3, mine_unsolved: 4,
};

describe('SupportViewsSidebar', () => {
    it('renders the six views with composed count badges', () => {
        render(<SupportViewsSidebar counts={counts} view="mine" onSelectView={vi.fn()} channel={null} onSelectChannel={vi.fn()} tag={null} onClearTag={vi.fn()} />);
        expect(screen.getByText('Your unsolved tickets')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument(); // mine_unsolved badge
    });

    it('renders the Channels list with per-channel counts and calls onSelectChannel', () => {
        const onSelectChannel = vi.fn();
        render(<SupportViewsSidebar counts={counts} view="mine" onSelectView={vi.fn()} channel={null} onSelectChannel={onSelectChannel} tag={null} onClearTag={vi.fn()} />);
        const chat = screen.getByRole('button', { name: /Chat/ });
        expect(chat).toBeInTheDocument();
        fireEvent.click(chat);
        expect(onSelectChannel).toHaveBeenCalledWith('chat');
    });

    it('marks the active channel via aria-pressed', () => {
        render(<SupportViewsSidebar counts={counts} view="mine" onSelectView={vi.fn()} channel="email" onSelectChannel={vi.fn()} tag={null} onClearTag={vi.fn()} />);
        expect(screen.getByRole('button', { name: /Email/ })).toHaveAttribute('aria-pressed', 'true');
    });

    it('calls onSelectView when a view is clicked', () => {
        const onSelectView = vi.fn();
        render(<SupportViewsSidebar counts={counts} view="mine" onSelectView={onSelectView} channel={null} onSelectChannel={vi.fn()} tag={null} onClearTag={vi.fn()} />);
        fireEvent.click(screen.getByText('Pending'));
        expect(onSelectView).toHaveBeenCalledWith('pending');
    });

    it('shows a clearable active-tag chip and calls onClearTag', () => {
        const onClearTag = vi.fn();
        render(<SupportViewsSidebar counts={counts} view="mine" onSelectView={vi.fn()} channel={null} onSelectChannel={vi.fn()} tag={{ id: 't1', name: 'billing' }} onClearTag={onClearTag} />);
        fireEvent.click(screen.getByRole('button', { name: /Tag: billing/ }));
        expect(onClearTag).toHaveBeenCalledTimes(1);
    });
});
