import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CommentReactions } from './CommentReactions';

describe('CommentReactions', () => {
    it('renders existing reaction pills and toggles on click', () => {
        const onToggle = vi.fn();
        render(<CommentReactions reactions={[{ emoji: '👀', count: 3, reacted: true }]} onToggle={onToggle} />);
        fireEvent.click(screen.getByRole('button', { name: /👀 3/ }));
        expect(onToggle).toHaveBeenCalledWith('👀');
    });
    it('adds a new reaction from the palette', () => {
        const onToggle = vi.fn();
        render(<CommentReactions reactions={[]} onToggle={onToggle} />);
        fireEvent.click(screen.getByRole('button', { name: 'Add reaction' }));
        fireEvent.click(screen.getByRole('button', { name: '🎯' }));
        expect(onToggle).toHaveBeenCalledWith('🎯');
    });

    it('v2: reacted pills use the highlighter; the rest hover via classes', () => {
        render(<CommentReactions reactions={[{ emoji: '👀', count: 3, reacted: true }, { emoji: '🎯', count: 1, reacted: false }]} onToggle={vi.fn()} />);
        const mine = screen.getByRole('button', { name: /👀 3/ });
        const other = screen.getByRole('button', { name: /🎯 1/ });
        expect(mine.className).toContain('bg-hi');
        expect(mine.style.borderColor).toBe('');
        expect(other.className).toContain('hover:border-fg');
        expect(other.style.background).toBe('');
    });
});
