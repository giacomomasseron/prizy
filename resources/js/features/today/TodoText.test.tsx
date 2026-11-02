import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Todo } from '../../lib/types';
import { TodoText } from './TodoText';

// Today v2: a to-do's text as typed, and its linked issue's reference as a pill after it.
const ISSUE = { id: 'i1', identifier: 'PRZ-ABC123', title: 'Fix login', status: 'todo' as const };

function todo(text: string, issue: Todo['issue'] = null): Todo {
    return { id: 't1', text, done: false, completed_at: null, position: 1, issue, created_at: '' };
}

describe('TodoText', () => {
    it('shows the text as typed, then the reference as a pill that opens the issue', () => {
        const { container } = render(<MemoryRouter><TodoText todo={todo('Ask @Maya Chen about PRZ-ABC123', ISSUE)} /></MemoryRouter>);

        const link = screen.getByRole('link', { name: 'PRZ-ABC123' });
        expect(link).toHaveAttribute('href', '/issues/i1');
        expect(link).toHaveAttribute('title', 'Fix login');
        expect(container.textContent).toBe('Ask @Maya Chen about PRZ-ABC123 PRZ-ABC123');
        expect(link.previousElementSibling?.textContent).toBe('Ask @Maya Chen about PRZ-ABC123');
        expect(container.querySelector('strong')).toBeNull();
    });

    it('lights the pill up on hover through classes: an inline background would beat them', () => {
        render(<MemoryRouter><TodoText todo={todo('Follow up', ISSUE)} /></MemoryRouter>);
        const link = screen.getByRole('link', { name: 'PRZ-ABC123' });
        expect(link.style.background).toBe('');
        expect(link.className).toContain('bg-sticky-field');
        expect(link.className).toContain('hover:bg-sticky-pop');
    });

    it('shows no pill without a linked issue', () => {
        const { container } = render(<MemoryRouter><TodoText todo={todo('Book 1:1 with Priya')} /></MemoryRouter>);
        expect(screen.queryByRole('link')).toBeNull();
        expect(container.textContent).toBe('Book 1:1 with Priya');
    });
});
