import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RAIL_ACTIVE_CLASSES, RAIL_ITEM_CLASSES, SupportRail, railItem } from './SupportRail';

vi.mock('../../auth/useAuth', () => ({ useMe: () => ({ data: { id: 'u1', name: 'Alex' } }) }));

describe('SupportRail', () => {
    it('v2: frames the items with the ink brand link, Switch to Engineering and the user', () => {
        render(
            <MemoryRouter>
                <SupportRail><button type="button" title="Item" className={RAIL_ITEM_CLASSES} style={railItem}>⌂</button></SupportRail>
            </MemoryRouter>,
        );
        const brand = screen.getByRole('link', { name: 'Prizy' });
        expect(brand).toHaveAttribute('href', '/support');
        expect((brand.querySelector('[aria-hidden="true"]') as HTMLElement).style.background).toBe('var(--fg)');
        expect(screen.getByTitle('Item')).toBeInTheDocument();
        const eng = screen.getByRole('link', { name: 'Switch to Engineering' });
        expect(eng).toHaveAttribute('title', 'Switch to Engineering');
        expect(eng.className).toContain('hover:border-accent');
        expect(eng.style.borderStyle).toBe('solid');
    });

    it('v2: item colours live in classes so the hover works', () => {
        expect(RAIL_ITEM_CLASSES).toBe('bg-transparent text-fg3 hover:bg-hover hover:text-fg');
        expect(RAIL_ACTIVE_CLASSES).toBe('bg-sup2 text-sup-ink');
        expect(railItem).not.toHaveProperty('color');
        expect(railItem).not.toHaveProperty('background');
        expect(railItem).toMatchObject({ width: 38, height: 38, borderRadius: 10 });
    });
});

describe('G3c: SupportRail inset', () => {
    it('G3c: the top padding leaves room for the floating expand button', () => {
        const { container } = render(<MemoryRouter><SupportRail><span /></SupportRail></MemoryRouter>);
        expect((container.firstElementChild as HTMLElement).style.paddingTop).toBe('calc(12px + var(--nav-inset, 0px))');
    });
});
