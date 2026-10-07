import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
    it('renders the title as a highlighted display h1', () => {
        render(<PageHeader title="Issues" />);
        const h1 = screen.getByRole('heading', { level: 1, name: 'Issues' });
        expect(h1.style.fontFamily).toBe('var(--font-display)');
        expect(h1.querySelector('span.hl')?.textContent).toBe('Issues');
    });
    it('renders children after the title and actions in a right-aligned group', () => {
        render(<PageHeader title="Issues" actions={<button type="button">New</button>}><span>chip</span></PageHeader>);
        expect(screen.getByText('chip')).toBeInTheDocument();
        const actions = screen.getByRole('button', { name: 'New' }).parentElement as HTMLElement;
        expect(actions.style.marginLeft).toBe('auto');
    });
    it('omits the actions group when no actions are given', () => {
        const { container } = render(<PageHeader title="X" />);
        expect(container.querySelector('header')?.children).toHaveLength(1);
    });
});
