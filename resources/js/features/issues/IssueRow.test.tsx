import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import { IssueRow, formatRelativeShort } from './IssueRow';
import type { Issue } from '../../lib/types';

const BASE: Issue = {
    id: 'abc-123-xyz-qrs',
    title: 'Fix login bug',
    description: null,
    status: 'in_progress',
    priority: 'high',
    estimate: null,
    due_date: null,
    sort_order: 0,
    team_id: 'team-1',
    project_id: null,
    cycle_id: null,
    parent_issue_id: null,
    assignee_id: null,
    created_by: 'u1',
    archived_at: null,
    created_at: '2026-07-01T00:00:00.000000Z',
    updated_at: '2026-07-02T00:00:00.000000Z',
    labels: [],
};

describe('IssueRow', () => {
    function renderRow(overrides: Partial<Issue> = {}) {
        const onPeek = vi.fn();
        const { container } = render(
            <MemoryRouter>
                <IssueRow issue={{ ...BASE, ...overrides }} onPeek={onPeek} projects={[]} />
            </MemoryRouter>
        );
        return { onPeek, container };
    }

    it('renders priority icon aria-label=high', () => {
        renderRow();
        expect(screen.getByLabelText('high')).toBeInTheDocument();
    });

    it('renders status icon aria-label=in_progress', () => {
        renderRow();
        expect(screen.getByLabelText('in_progress')).toBeInTheDocument();
    });

    it('uses id prefix as identifier fallback (first 6 chars uppercased)', () => {
        renderRow();
        // BASE.id = 'abc-123-xyz-qrs', first 6 uppercase = 'ABC-12'
        expect(screen.getByText('ABC-12')).toBeInTheDocument();
    });

    it('prefers issue.identifier when present', () => {
        renderRow({ identifier: 'PRZ-42' });
        expect(screen.getByText('PRZ-42')).toBeInTheDocument();
        expect(screen.queryByText('ABC-12')).not.toBeInTheDocument();
    });

    it('renders title text', () => {
        renderRow();
        expect(screen.getByText('Fix login bug')).toBeInTheDocument();
    });

    it('calls onPeek with issue.id on row click', () => {
        const { onPeek, container } = renderRow();
        const row = container.querySelector('[data-testid="issue-row"]')!;
        fireEvent.click(row);
        expect(onPeek).toHaveBeenCalledWith('abc-123-xyz-qrs');
    });

    it('renders LabelChip for each embedded label', () => {
        renderRow({ labels: [{ id: 'l1', name: 'frontend', color: '#4bab66' }] });
        expect(screen.getByText('frontend')).toBeInTheDocument();
    });

    it('renders ProjectPill when project_id matches passed projects', () => {
        const proj = { id: 'p1', name: 'Alpha', color: '#6d69f2',
            description: null, icon: null, status: 'in_progress' as const,
            team_id: null, start_date: null, target_date: null,
            created_by: 'u1', created_at: '2026-07-04T00:00:00.000000Z',
            updated_at: '2026-07-04T00:00:00.000000Z' };
        render(
            <MemoryRouter>
                <IssueRow issue={{ ...BASE, project_id: 'p1' }} onPeek={vi.fn()} projects={[proj]} />
            </MemoryRouter>
        );
        expect(screen.getByText('Alpha')).toBeInTheDocument();
    });
});

describe('formatRelativeShort', () => {
    it('returns "today" for same-day ISO', () => {
        expect(formatRelativeShort(new Date().toISOString())).toBe('today');
    });
    it('returns "2d" for 2 days ago', () => {
        expect(formatRelativeShort(new Date(Date.now() - 2 * 86_400_000).toISOString())).toBe('2d');
    });
    it('returns "1w" for 8 days ago', () => {
        expect(formatRelativeShort(new Date(Date.now() - 8 * 86_400_000).toISOString())).toBe('1w');
    });
    it('returns "1mo" for 35 days ago', () => {
        expect(formatRelativeShort(new Date(Date.now() - 35 * 86_400_000).toISOString())).toBe('1mo');
    });
});
