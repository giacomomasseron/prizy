import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReportingSidebar } from './ReportingSidebar';

describe('ReportingSidebar', () => {
    it('renders the three report sections and calls onSelectSection', () => {
        const onSelectSection = vi.fn();
        render(<ReportingSidebar section="overview" onSelectSection={onSelectSection} />);
        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByText('SLA & channels')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Agents & CSAT'));
        expect(onSelectSection).toHaveBeenCalledWith('agents');
    });
});
