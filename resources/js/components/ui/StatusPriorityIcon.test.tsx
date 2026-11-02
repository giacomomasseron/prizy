import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusIcon } from './StatusIcon';
import { PriorityIcon } from './PriorityIcon';

describe('StatusIcon / PriorityIcon decorative mode (V2-G3c)', () => {
    it('G3c: by default the icons are named images', () => {
        render(<><StatusIcon status="todo" /><PriorityIcon priority="high" /></>);
        expect(screen.getByRole('img', { name: 'Status: Todo' })).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Priority: High' })).toBeInTheDocument();
    });
    it('G3c: decorative icons are hidden from assistive tech, with no role and no label', () => {
        const { container } = render(<><StatusIcon status="todo" decorative /><PriorityIcon priority="high" decorative /><PriorityIcon priority="urgent" decorative /></>);
        expect(screen.queryByRole('img')).toBeNull();
        const hidden = container.querySelectorAll('[aria-hidden="true"]');
        expect(hidden.length).toBeGreaterThanOrEqual(3);
        for (const el of Array.from(container.children)) {
            expect(el).toHaveAttribute('aria-hidden', 'true');
            expect(el).not.toHaveAttribute('role');
            expect(el).not.toHaveAttribute('aria-label');
        }
    });
});
