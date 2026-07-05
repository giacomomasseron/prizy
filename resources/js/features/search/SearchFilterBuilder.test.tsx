import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchFilterBuilder } from './SearchFilterBuilder';

// Mock hooks — hooks are fully replaced; no QueryClient needed.
vi.mock('../members/hooks', () => ({
    useMembers: () => ({ data: [{ id: 'u1', name: 'Alice Smith' }] }),
}));
vi.mock('../projects/hooks', () => ({
    useProjects: () => ({ data: { items: [{ id: 'p1', name: 'Acme Project', color: '#6d69f2' }] } }),
}));
vi.mock('../labels/hooks', () => ({
    useLabels: () => ({ data: { items: [{ id: 'l1', name: 'Bug', color: '#e64980' }] } }),
}));

describe('SearchFilterBuilder', () => {
    it('adds a priority filter: open menu → pick Priority → pick Urgent → onChange({ priority: "urgent" })', async () => {
        const onChange = vi.fn();
        render(<SearchFilterBuilder filters={{}} onChange={onChange} />);

        // Open the "+ Add filter" menu
        await userEvent.click(screen.getByRole('button', { name: '+ Add filter' }));

        // Pick the Priority field
        await userEvent.click(screen.getByRole('menuitem', { name: 'Priority' }));

        // The value picker card appears — click the Urgent chip
        await userEvent.click(screen.getByRole('button', { name: 'Urgent' }));

        expect(onChange).toHaveBeenCalledWith({ priority: 'urgent' });
    });

    it('removes a filter pill when the × button is clicked', async () => {
        const onChange = vi.fn();
        render(<SearchFilterBuilder filters={{ priority: 'urgent' }} onChange={onChange} />);

        await userEvent.click(screen.getByRole('button', { name: 'Remove Priority filter' }));

        expect(onChange).toHaveBeenCalledWith({});
    });

    it('clears all filters when "Clear all" is clicked', async () => {
        const onChange = vi.fn();
        render(
            <SearchFilterBuilder filters={{ priority: 'urgent', status: 'todo' }} onChange={onChange} />,
        );

        await userEvent.click(screen.getByRole('button', { name: 'Clear all' }));

        expect(onChange).toHaveBeenCalledWith({});
    });

    it('shows active pill with field label and value label', () => {
        const { container } = render(
            <SearchFilterBuilder filters={{ status: 'in_progress' }} onChange={vi.fn()} />,
        );

        // The pill renders "Status" and "In Progress" somewhere in the DOM
        expect(container.textContent).toContain('Status');
        expect(container.textContent).toContain('In Progress');
    });

    it('hides "Clear all" when no filters are active', () => {
        render(<SearchFilterBuilder filters={{}} onChange={vi.fn()} />);
        expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
    });
});
