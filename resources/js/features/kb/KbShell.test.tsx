import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { KbShell } from './KbShell';
import { KbHeader } from './KbHeader';

vi.mock('../../auth/useAuth', () => ({ useMe: () => ({ data: { id: 'u1', name: 'Alex' } }) }));

function renderShell() {
    return render(
        <MemoryRouter>
            <KbShell>
                <KbHeader title="Knowledge base" subtitle="2 articles · 1 live · 1 category" />
            </KbShell>
        </MemoryRouter>,
    );
}

describe('KbShell', () => {
    it('v2: the brand link is named Prizy and shows the ink mark', () => {
        renderShell();
        const brand = screen.getByRole('link', { name: 'Prizy' });
        expect(brand).toHaveAttribute('href', '/support');
        const mark = brand.querySelector('[aria-hidden="true"]') as HTMLElement;
        expect(mark.style.background).toBe('var(--fg)');
        expect(mark.style.borderRadius).toBe('50%');
    });

    it('v2: rail links keep their colours in classes so the hover works', () => {
        renderShell();
        const desk = screen.getByRole('link', { name: 'Desk' });
        expect(desk.className).toContain('hover:bg-hover');
        expect(desk.style.color).toBe('');
        expect(desk.style.background).toBe('');
        const kb = screen.getByRole('link', { name: 'Knowledge base' });
        expect(kb.className).toContain('bg-sup2');
        expect(kb.className).toContain('text-sup');
        expect(kb).toHaveAttribute('aria-current', 'page');
        const eng = screen.getByRole('link', { name: 'Switch to Engineering' });
        expect(eng.className).toContain('hover:border-accent');
        expect(eng.style.borderStyle).toBe('solid');
        expect(eng.style.borderColor).toBe('');
    });
});

describe('KbHeader', () => {
    it('v2: shows a display-font title that is not a heading, the help-center link and the theme toggle', () => {
        renderShell();
        const title = screen.getByTestId('kb-header-title');
        expect(title).toHaveTextContent('Knowledge base');
        expect(title.style.fontFamily).toBe('var(--font-display)');
        expect(title.tagName).toBe('DIV');
        expect(screen.queryByRole('heading')).toBeNull();
        expect(screen.getByText('2 articles · 1 live · 1 category')).toBeInTheDocument();
        const help = screen.getByRole('link', { name: 'Customer help center ↗' });
        expect(help).toHaveAttribute('href', '/help');
        expect(help).toHaveAttribute('target', '_blank');
        expect(help.className).toContain('hover:text-accent');
        expect(screen.getByRole('button', { name: /Switch to (dark|light) theme/ })).toBeInTheDocument();
    });
});
