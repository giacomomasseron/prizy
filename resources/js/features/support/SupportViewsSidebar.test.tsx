import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SupportViewsSidebar } from './SupportViewsSidebar';
import type { TicketCounts, HelpdeskSavedView } from '../../lib/types';

const counts: TicketCounts = {
    by_status: { new: 1, open: 2, pending: 3, on_hold: 0, solved: 4, closed: 1 },
    by_channel: { email: 5, chat: 2, portal: 0, api: 1 },
    unassigned: 3, mine_unsolved: 4,
};

const savedViews: HelpdeskSavedView[] = [
    { id: 'sv1', name: 'Email backlog', created_by: 'u1', definition: { filter: { channel: 'email' }, sort: 'created_at' }, created_at: '', updated_at: '' },
];

function sidebarProps(overrides = {}) {
    return {
        counts: undefined,
        view: 'mine' as const,
        onSelectView: vi.fn(),
        channel: null,
        onSelectChannel: vi.fn(),
        tag: null,
        onClearTag: vi.fn(),
        savedViews,
        savedViewId: null as string | null,
        onSelectSavedView: vi.fn(),
        onDeleteSavedView: vi.fn(),
        onSaveView: vi.fn(),
        ...overrides,
    };
}

describe('SupportViewsSidebar', () => {
    it('renders the six views with composed count badges', () => {
        render(<SupportViewsSidebar {...sidebarProps({ counts })} />);
        expect(screen.getByText('Your unsolved tickets')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument(); // mine_unsolved badge
    });

    it('renders the Channels list with per-channel counts and calls onSelectChannel', () => {
        const onSelectChannel = vi.fn();
        render(<SupportViewsSidebar {...sidebarProps({ counts, onSelectChannel })} />);
        const chat = screen.getByRole('button', { name: /Chat/ });
        expect(chat).toBeInTheDocument();
        fireEvent.click(chat);
        expect(onSelectChannel).toHaveBeenCalledWith('chat');
    });

    it('marks the active channel via aria-pressed', () => {
        render(<SupportViewsSidebar {...sidebarProps({ counts, channel: 'email', savedViews: [] })} />);
        expect(screen.getByRole('button', { name: /Email/ })).toHaveAttribute('aria-pressed', 'true');
    });

    it('calls onSelectView when a view is clicked', () => {
        const onSelectView = vi.fn();
        render(<SupportViewsSidebar {...sidebarProps({ counts, onSelectView })} />);
        fireEvent.click(screen.getByText('Pending'));
        expect(onSelectView).toHaveBeenCalledWith('pending');
    });

    it('shows a clearable active-tag chip and calls onClearTag', () => {
        const onClearTag = vi.fn();
        render(<SupportViewsSidebar {...sidebarProps({ counts, tag: { id: 't1', name: 'billing' }, onClearTag })} />);
        fireEvent.click(screen.getByRole('button', { name: /Tag: billing/ }));
        expect(onClearTag).toHaveBeenCalledTimes(1);
    });

    it('renders the Saved views group and selects one', () => {
        const onSelectSavedView = vi.fn();
        render(<SupportViewsSidebar {...sidebarProps({ onSelectSavedView })} />);
        fireEvent.click(screen.getByText('Email backlog'));
        expect(onSelectSavedView).toHaveBeenCalledWith('sv1');
    });

    it('reveals the inline save form and submits a name', () => {
        const onSaveView = vi.fn();
        render(<SupportViewsSidebar {...sidebarProps({ onSaveView })} />);
        fireEvent.click(screen.getByRole('button', { name: /\+ Save view/ }));
        fireEvent.change(screen.getByPlaceholderText('View name'), { target: { value: 'My view' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(onSaveView).toHaveBeenCalledWith('My view');
    });

    it('deletes a saved view via its × control', () => {
        const onDeleteSavedView = vi.fn();
        render(<SupportViewsSidebar {...sidebarProps({ onDeleteSavedView })} />);
        fireEvent.click(screen.getByRole('button', { name: 'Delete view Email backlog' }));
        expect(onDeleteSavedView).toHaveBeenCalledWith('sv1');
    });

    it('v2: display-font title, sentence-case labels and v2 rows whose hover is not blocked', () => {
        render(<SupportViewsSidebar {...sidebarProps({ counts })} />);
        expect(screen.getByText('Support').style.fontFamily).toBe('var(--font-display)');
        expect(screen.getByText('Views').style.textTransform).toBe('');
        const active = screen.getByRole('button', { name: /Your unsolved tickets/ });
        expect(active.style.background).toBe('var(--panel)');
        const inactive = screen.getByRole('button', { name: /All unsolved/ });
        expect(inactive.className).toContain('hover:bg-hover');
        expect(inactive.style.background).toBe('');
        expect(screen.getByRole('button', { name: 'Delete view Email backlog' }).className).toContain('hover:text-red');
    });

    it('v2: the save-view form uses the v2 input and buttons', () => {
        render(<SupportViewsSidebar {...sidebarProps()} />);
        fireEvent.click(screen.getByRole('button', { name: /\+ Save view/ }));
        expect(screen.getByPlaceholderText('View name').className).toContain('focus:border-fg');
        expect(screen.getByRole('button', { name: 'Save' }).className).toContain('bg-fg');
        expect(screen.getByRole('button', { name: 'Cancel' }).className).toContain('border-border2');
    });

    it('v2: the tag filter chip has a green border and ink text', () => {
        render(<SupportViewsSidebar {...sidebarProps({ tag: { id: 't1', name: 'billing' } })} />);
        const chip = screen.getByRole('button', { name: /Tag: billing/ });
        expect(chip.className).toContain('border-sup');
        expect(chip.className).toContain('text-fg');
        expect(chip.style.borderRadius).toBe('var(--radius-pill)');
    });

    it('v2: a long tag name truncates inside the sidebar, with the full name in the title', () => {
        const name = 'a-very-long-tag-name-that-would-overflow-the-sidebar';
        render(<SupportViewsSidebar {...sidebarProps({ counts, tag: { id: 't1', name } })} />);
        const chip = screen.getByRole('button', { name: `Tag: ${name}` });
        expect(chip.style.maxWidth).toBe('100%');
        expect(chip).toHaveAttribute('title', `Tag: ${name}`);
        expect(screen.getByText(`Tag: ${name}`).style.textOverflow).toBe('ellipsis');
    });

    it('G3b: the view name field is named', () => {
        render(<SupportViewsSidebar {...sidebarProps({})} />);
        fireEvent.click(screen.getByRole('button', { name: /\+ Save view/ }));
        expect(screen.getByRole('textbox', { name: 'View name' })).toBeInTheDocument();
    });
});
