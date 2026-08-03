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
});
