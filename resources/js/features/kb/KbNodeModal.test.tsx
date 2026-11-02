import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { KbNodeModal, type NodeModalState } from './KbNodeModal';

function renderModal(state: NodeModalState) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={qc}>
            <KbNodeModal state={state} categories={[]} onClose={vi.fn()} onCreated={vi.fn()} />
        </QueryClientProvider>,
    );
}

describe('KbNodeModal', () => {
    it('v2: uses the display-font dialog title, subtitle and footer layout', () => {
        renderModal({ kind: 'category' });
        const h2 = screen.getByRole('heading', { level: 2, name: 'New category' });
        expect(h2.style.fontFamily).toBe('var(--font-display)');
        expect(screen.getByText('A top-level topic on the help center.')).toBeInTheDocument();
        const foot = screen.getByText('Position: last in the library');
        expect(foot.parentElement).toContainElement(screen.getByRole('button', { name: 'Create' }));
    });

    it('v2: a selected swatch is round with the ring; a selected icon tile takes the chosen colour', async () => {
        renderModal({ kind: 'category' });
        await userEvent.click(screen.getByRole('button', { name: '#5b8def' }));
        const swatch = screen.getByRole('button', { name: '#5b8def' });
        expect(swatch).toHaveAttribute('aria-pressed', 'true');
        expect(swatch.style.borderRadius).toBe('50%');
        expect(swatch.style.boxShadow).toBe('0 0 0 2px var(--panel), 0 0 0 3.5px var(--fg)');
        expect(screen.getByRole('button', { name: '#3aa76d' }).style.boxShadow).toBe('none');

        await userEvent.click(screen.getByRole('button', { name: '☂' }));
        const tile = screen.getByRole('button', { name: '☂' });
        expect(tile.style.borderColor).toBe('rgb(91, 141, 239)');
        expect(tile.className).toBe('');
        const other = screen.getByRole('button', { name: '◇' });
        expect(other.className).toContain('hover:border-fg');
        expect(other.style.borderColor).toBe('');
    });

    it('v2: the preview card shows the icon in its colour on a tile', async () => {
        renderModal({ kind: 'category' });
        await userEvent.type(screen.getByPlaceholderText('e.g. Accounts & SSO'), 'Billing');
        const preview = screen.getByTestId('kb-node-preview');
        expect(preview.style.borderRadius).toBe('var(--radius-row)');
        expect(preview).toHaveTextContent('Billing');
    });

    it('v2: a section dialog has the display title and no icon, colour or preview', () => {
        renderModal({ kind: 'section', categoryId: 'c1' });
        expect(screen.getByRole('heading', { level: 2, name: 'New section' }).style.fontFamily).toBe('var(--font-display)');
        expect(screen.queryByTestId('kb-node-preview')).toBeNull();
        expect(screen.getByText('Position: last in the category')).toBeInTheDocument();
    });
});

describe('G3c: KbNodeModal preview name', () => {
    it('G3c: the preview name is one ellipsised line with the full name in its title', async () => {
        renderModal({ kind: 'category' });
        const long = 'A very long category name that would otherwise wrap the preview card';
        await userEvent.type(screen.getByPlaceholderText('e.g. Accounts & SSO'), long);
        const name = screen.getByTestId('kb-node-preview').querySelector(`[title="${long}"]`) as HTMLElement;
        expect(name).not.toBeNull();
        expect(name.style.textOverflow).toBe('ellipsis');
        expect(name.style.whiteSpace).toBe('nowrap');
        expect(name.style.overflow).toBe('hidden');
    });
});
