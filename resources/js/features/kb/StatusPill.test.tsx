import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusPill } from './StatusPill';

describe('StatusPill', () => {
    it('v2: renders the label on a token tone, with no fixed colours', () => {
        render(<><StatusPill status="published" /><StatusPill status="draft" /><StatusPill status="archived" /></>);
        const published = screen.getByText('Published');
        expect(published.style.color).toBe('var(--sup-ink)');
        expect(published.style.background).toBe('var(--sup2)');
        expect(published.style.borderRadius).toBe('var(--radius-pill)');
        expect(screen.getByText('Draft').style.background).toBe('var(--hover)');
        expect(screen.getByText('Archived').style.borderColor).toBe('var(--border2)');
    });
});
