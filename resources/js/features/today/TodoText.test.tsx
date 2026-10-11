import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Todo } from '../../lib/types';
import { TodoText } from './TodoText';

// P7-B: a to-do's text — the linked issue's reference is a pill, member mentions are bold.
const ISSUE = { id: 'i1', identifier: 'PRZ-ABC123', title: 'Fix login', status: 'todo' as const };

function todo(text: string, issue: Todo['issue'] = null): Todo {
    return { id: 't1', text, done: false, completed_at: null, position: 1, issue, created_at: '' };
}

describe('TodoText', () => {
    it('renders the reference as a pill that opens the issue, and a mention in bold', () => {
        render(<MemoryRouter><TodoText todo={todo('Ask @Maya Chen about PRZ-ABC123', ISSUE)} names={['Maya Chen']} /></MemoryRouter>);

        expect(screen.getByRole('link', { name: 'PRZ-ABC123' })).toHaveAttribute('href', '/issues/i1');
        expect(screen.getByText('@Maya Chen').tagName).toBe('STRONG');
    });

    it('puts the pill after the text when the text no longer holds the reference', () => {
        const { container } = render(<MemoryRouter><TodoText todo={todo('Follow up', ISSUE)} names={[]} /></MemoryRouter>);

        const link = screen.getByRole('link', { name: 'PRZ-ABC123' });
        expect(container.textContent).toBe('Follow up PRZ-ABC123');
        expect(link.previousElementSibling?.textContent).toBe('Follow up');
    });

    it('shows no pill without a linked issue', () => {
        render(<MemoryRouter><TodoText todo={todo('Book 1:1 with Priya')} names={[]} /></MemoryRouter>);
        expect(screen.queryByRole('link')).toBeNull();
    });
});
