import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProjectBadge } from './ProjectBadge';

describe('ProjectBadge', () => {
    it('renders a round, decorative badge with the upper-cased initial', () => {
        const { container } = render(<ProjectBadge name="escalation engine" color="#6d69f2" size={60} />);
        const el = container.firstElementChild as HTMLElement;
        expect(el.textContent).toBe('E');
        expect(el.getAttribute('aria-hidden')).toBe('true');
        expect(el.style.borderRadius).toBe('50%');
        expect(el.style.width).toBe('60px');
        expect(el.style.fontSize).toBe('27px');
        expect(el.style.fontFamily).toBe('var(--font-display)');
    });
    it('falls back to a neutral fill and "?" while the project is unknown', () => {
        const { container } = render(<ProjectBadge name="" color={null} size={36} />);
        const el = container.firstElementChild as HTMLElement;
        expect(el.textContent).toBe('?');
        expect(el.style.background).toBe('var(--border2)');
    });

    it('G3a: the initial is ink on a pale project colour (white would be under 3:1)', () => {
        const { container } = render(<ProjectBadge name="ops" color="#e0894a" size={30} />);
        expect((container.firstElementChild as HTMLElement).style.color).toBe('var(--on-hi)');
    });
});
