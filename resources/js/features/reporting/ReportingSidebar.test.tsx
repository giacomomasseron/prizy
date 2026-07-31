import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReportingSidebar } from './ReportingSidebar';
import type { HelpdeskSavedReport } from '../../lib/types';

const savedReports: HelpdeskSavedReport[] = [
    { id: 'sr1', name: 'Weekly overview', created_by: 'u1', definition: { section: 'overview', range: '7d' }, created_at: '', updated_at: '' },
];

function sidebarProps(overrides = {}) {
    return {
        section: 'overview' as const,
        onSelectSection: vi.fn(),
        savedReports,
        onSelectReport: vi.fn(),
        onDeleteReport: vi.fn(),
        onSaveReport: vi.fn(),
        ...overrides,
    };
}

describe('ReportingSidebar', () => {
    it('renders the three report sections and calls onSelectSection', () => {
        const onSelectSection = vi.fn();
        render(<ReportingSidebar {...sidebarProps({ onSelectSection })} />);
        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByText('SLA & channels')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Agents & CSAT'));
        expect(onSelectSection).toHaveBeenCalledWith('agents');
    });

    it('renders the Saved reports group and selects one (applies section+range)', () => {
        const onSelectReport = vi.fn();
        render(<ReportingSidebar {...sidebarProps({ onSelectReport })} />);
        fireEvent.click(screen.getByText('Weekly overview'));
        expect(onSelectReport).toHaveBeenCalledWith('overview', '7d');
    });

    it('reveals the inline save form and submits a name', () => {
        const onSaveReport = vi.fn();
        render(<ReportingSidebar {...sidebarProps({ onSaveReport })} />);
        fireEvent.click(screen.getByRole('button', { name: /\+ Save report/ }));
        fireEvent.change(screen.getByPlaceholderText('Report name'), { target: { value: 'My report' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(onSaveReport).toHaveBeenCalledWith('My report');
    });

    it('deletes a saved report via its × control', () => {
        const onDeleteReport = vi.fn();
        render(<ReportingSidebar {...sidebarProps({ onDeleteReport })} />);
        fireEvent.click(screen.getByRole('button', { name: 'Delete report Weekly overview' }));
        expect(onDeleteReport).toHaveBeenCalledWith('sr1');
    });
});
