import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandMark } from './BrandMark';

describe('BrandMark', () => {
    it('is a decorative ink circle with a cream P at the default 30px', () => {
        const { container } = render(<BrandMark />);
        const el = container.firstElementChild as HTMLElement;
        expect(el.getAttribute('aria-hidden')).toBe('true');
        expect(el.textContent).toBe('P');
        expect(el.style.width).toBe('30px');
        expect(el.style.borderRadius).toBe('50%');
        expect(el.style.background).toBe('var(--fg)');
        expect(el.style.color).toBe('var(--bg)');
        expect(el.style.fontFamily).toBe('var(--font-display)');
    });
    it('scales with size', () => {
        const { container } = render(<BrandMark size={24} />);
        expect((container.firstElementChild as HTMLElement).style.height).toBe('24px');
    });
});
